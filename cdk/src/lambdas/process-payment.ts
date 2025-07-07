import { SQSEvent, SQSHandler } from 'aws-lambda';
import { getDataSource } from '../utils/database';
import { sendToSQS } from '../config/aws-client';

import { Invoice } from '../entities/invoice';
import { Pickup } from '../entities/pickup';
import { TransactionLedger } from '../entities/transaction-ledger';
import { TransactionType } from '../entities/transaction-type';
import { PickupStatus } from '../entities/pickup-status';
import { OrderStatus, TransactionTypeName } from '../types/enum';
import { PaymentRecord } from '../entities/payment-record';

const pickupQueueUrl = process.env.PICKUP_QUEUE_URL!;
const TRANSACTION_TYPE_NAME = TransactionTypeName.PaymentReceived;

export const lambdaHandler: SQSHandler = async (event: SQSEvent) => {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    for (const record of event.Records) {
        const payload = JSON.parse(record.body);

        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();

            const invoiceRepo = queryRunner.manager.getRepository(Invoice);
            const pickupRepo = queryRunner.manager.getRepository(Pickup);
            const txRepo = queryRunner.manager.getRepository(TransactionLedger);
            const txTypeRepo = queryRunner.manager.getRepository(TransactionType);
            const statusRepo = queryRunner.manager.getRepository(PickupStatus);
            const paymentRepo = queryRunner.manager.getRepository(PaymentRecord);

            const invoice = await invoiceRepo.findOne({
                where: { referenceNumber: payload.reference },
                relations: ['pickup']
            });

            if (!invoice || !invoice.pickup) {
                throw new Error(`Invoice not found or pickup missing for reference: ${payload.reference}`);
            }

            const pickup = invoice.pickup;
            const expectedAmount = Number(invoice.totalAmount);

            const payments = await paymentRepo.find({
                where: { reference: payload.reference }
            });

            const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

            if (totalPaid < expectedAmount) {
                throw new Error(`Underpayment: received ${totalPaid}, expected ${expectedAmount}`);
            }

            invoice.paid = true;
            await invoiceRepo.save(invoice);

            let txType = await txTypeRepo.findOne({ where: { typeName: TRANSACTION_TYPE_NAME } });
            if (!txType) {
                txType = txTypeRepo.create({ typeName: TRANSACTION_TYPE_NAME });
                await txTypeRepo.save(txType);
            }

            const transaction = txRepo.create({
                invoice,
                transactionType: txType,
                amount: totalPaid,
                transactionDate: new Date(payload.timestamp)
            });

            await txRepo.save(transaction);

            const paidStatus = await statusRepo.findOne({ where: { orderStatusName: OrderStatus.Paid } });
            if (!paidStatus) throw new Error(`Missing ${OrderStatus.Paid} pickup status`);

            pickup.pickupStatus = paidStatus;
            await pickupRepo.save(pickup);

            await sendToSQS(JSON.stringify(pickup), pickupQueueUrl);

            await queryRunner.commitTransaction();
            console.log(`Processed invoice ${invoice.referenceNumber}, pickup ${pickup.id}`);
        } catch (error) {
            console.error('Payment processing failed:', error);
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }
    }
};
