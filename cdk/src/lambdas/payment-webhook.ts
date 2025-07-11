import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { isValidPayment } from '../utils/payment';
import { PaymentRecord } from '../entities/payment-record';
import { sendToSQS } from '../config/aws-client';
import { getDataSource } from '../config/database';

const paymentProcessingQueueUrl = process.env.PAYMENT_PROCESSING_QUEUE_URL!;

export const lambdaHandler: APIGatewayProxyHandler = async (event, context): Promise<APIGatewayProxyResult> => {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    try {
        const payload = JSON.parse(event.body || '{}');
        const validation = isValidPayment(payload);

        console.log('Received payment payload:', payload);
        console.log('Validation result:', validation);

        if (!validation) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid payment payload' }),
            };
        }

        await queryRunner.connect();
        await queryRunner.startTransaction();

        console.log('Connected to the database and started transaction');

        const paymentRepo = queryRunner.manager.getRepository(PaymentRecord);

        const existingPayment = await paymentRepo.findOne({
            where: { transaction_number: payload.transaction_number }
        });

        console.log('Checking for existing payment:', existingPayment);

        if (existingPayment) {
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'Payment already processed',
                    transaction_number: existingPayment.transaction_number
                })
            };
        }

        console.log('Creating new payment record with transaction number:', payload.transaction_number);

        const newPayment = paymentRepo.create({
            transaction_number: payload.transaction_number,
            status: payload.status,
            amount: payload.amount,
            timestamp: new Date(payload.timestamp),
            description: payload.description,
            from: payload.from,
            to: payload.to,
            reference: payload.reference
        });

        console.log('New payment record created:', newPayment);

        await paymentRepo.save(newPayment);

        console.log('New payment record saved to the database');

        await sendToSQS(JSON.stringify(payload), paymentProcessingQueueUrl);

        console.log('Payment payload sent to SQS queue:', paymentProcessingQueueUrl);

        await queryRunner.commitTransaction();

        console.log('Transaction committed successfully');

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Payment received successfully',
                transaction_number: newPayment.transaction_number
            })
        };

    } catch (error) {
        await queryRunner.rollbackTransaction();
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
            })
        };
    } finally {
        await queryRunner.release();
    }
};