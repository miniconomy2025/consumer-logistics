import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { getDataSource } from '../utils/database';
import { isValidPayment } from '../utils/payment';
import { PaymentRecord } from '../entities/payment-record';
import { sendToSQS } from '../config/aws-client';

const paymentProcessingQueueUrl = process.env.PAYMENT_PROCESSING_QUEUE_URL!;

export const lambdaHandler: APIGatewayProxyHandler = async (event, context): Promise<APIGatewayProxyResult> => {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    try {
        const payload = JSON.parse(event.body || '{}');
        const validation = isValidPayment(payload);

        if (!validation) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid payment payload' }),
            };
        }

        await queryRunner.connect();
        await queryRunner.startTransaction();

        const paymentRepo = queryRunner.manager.getRepository(PaymentRecord);

        const existingPayment = await paymentRepo.findOne({
            where: { transaction_number: payload.transaction_number }
        });

        if (existingPayment) {
            return {
                statusCode: 409,
                body: JSON.stringify({
                    message: 'Payment already processed',
                    transaction_number: existingPayment.transaction_number
                })
            };
        }

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

        await paymentRepo.save(newPayment);

        await sendToSQS(JSON.stringify(payload), paymentProcessingQueueUrl);

        await queryRunner.commitTransaction();

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