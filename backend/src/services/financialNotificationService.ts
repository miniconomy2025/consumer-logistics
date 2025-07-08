import { logger } from '../utils/logger';
import { PickupService } from './pickupService';
import { LogisticsPlanningService } from './logisticsPlanningService';
import { AppError } from '../shared/errors/ApplicationError';
import { TimeManager } from './timeManager'; 
import { PickupStatusEnum } from '../database/models/PickupEntity';

export interface PaymentNotification {
    transaction_number: string;
    status: string;
    amount: number;
    timestamp: string;
    description?: string;
    from?: string;
    to?: string;
    reference?: string;
}

export class FinancialNotificationService {
    private pickupService: PickupService;
    private logisticsPlanningService: LogisticsPlanningService;
    private timeManager: TimeManager; 

    constructor(
        pickupService: PickupService,
        logisticsPlanningService: LogisticsPlanningService,
        timeManager: TimeManager 
    ) {
        this.pickupService = pickupService;
        this.logisticsPlanningService = logisticsPlanningService;
        this.timeManager = timeManager; 
    }

    public async processPaymentNotification(notification: PaymentNotification): Promise<void> {
        logger.info(`Processing financial notification: Status: ${notification.status}, Amount: ${notification.amount}`);
        logger.debug('Webhook Body:', notification);

        if (notification.status === 'SUCCESS') {
            if (!notification.reference) {
                throw new AppError('Payment notification reference is missing. Cannot link to an invoice/pickup.', 400);
            }

            const pickupByInvoice = await this.pickupService.getPickupByInvoiceReference(notification.reference);

            if (!pickupByInvoice || !pickupByInvoice.invoice) {
                logger.warn(`No pickup or invoice found for reference: ${notification.reference}. Skipping processing.`);
                throw new AppError(`No pickup or invoice found for reference: ${notification.reference}.`, 404);
            }

            if (pickupByInvoice.invoice && notification.amount < pickupByInvoice.invoice.total_amount) {
                logger.warn(`Received insufficient payment for invoice ${notification.reference}. Expected: ${pickupByInvoice.invoice.total_amount}, Received: ${notification.amount}`);
                throw new AppError('Insufficient payment received.', 400);
            }

            if (pickupByInvoice.invoice && notification.amount > pickupByInvoice.invoice.total_amount) {
              logger.warn(`Received overpayment for invoice ${notification.reference}. Expected: ${pickupByInvoice.invoice.total_amount}, Received: ${notification.amount}. Processing as successful.`);
          }

            const paidPickup = await this.pickupService.markPickupAndInvoiceAsPaid(notification.reference);
            logger.info(`Invoice ${notification.reference} and Pickup ${paidPickup.pickup_id} marked as PAID_TO_LOGISTICS_CO based on webhook notification.`);

            const currentInSimTime = this.timeManager.getCurrentTime();
            let initialInSimPickupDate: Date;
            const startOfCurrentInSimDay = new Date(Date.UTC(currentInSimTime.getUTCFullYear(), currentInSimTime.getUTCMonth(), currentInSimTime.getUTCDate(), 0, 0, 0, 0));

            if (currentInSimTime.getUTCHours() === 0 && currentInSimTime.getUTCMinutes() === 0 && currentInSimTime.getUTCSeconds() === 0 && currentInSimTime.getUTCMilliseconds() === 0) {
                initialInSimPickupDate = startOfCurrentInSimDay;
            } else {
                initialInSimPickupDate = new Date(Date.UTC(currentInSimTime.getUTCFullYear(), currentInSimTime.getUTCMonth(), currentInSimTime.getUTCDate() + 1, 0, 0, 0, 0));
            }
            try {
                await this.logisticsPlanningService.planNewCollectionAfterPayment(
                    paidPickup.pickup_id,
                    paidPickup.phone_units,
                    initialInSimPickupDate
                );
                logger.info(`Logistics planning triggered for Pickup ${paidPickup.pickup_id} after payment.`);
                logger.info(`System's current in-sim time: ${currentInSimTime.toISOString()}`);

            } catch (error) {
                logger.error(`Failed to plan logistics for Pickup ${paidPickup.pickup_id} after payment:`, error);
                await this.pickupService.updatePickupStatus(paidPickup.pickup_id, PickupStatusEnum.FAILED);
                throw new AppError(`Failed to schedule logistics for pickup after payment: ${error instanceof AppError ? error.message : 'Unknown error'}`, 500);
            }
        }
    }
}