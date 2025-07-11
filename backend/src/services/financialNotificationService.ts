import { logger } from '../utils/logger';
import { PickupService } from './pickupService';
import { LogisticsPlanningService } from './logisticsPlanningService';
import { AppError } from '../shared/errors/ApplicationError';
import { TimeManager } from './timeManager'; 
import { PickupStatusEnum } from '../database/models/PickupEntity';
import { TruckManagementService } from './truckManagementService';
import { TruckRepository } from '../repositories/implementations/TruckRepository';

export interface PaymentNotification {
    transaction_number: string;
    status: string;
    amount: number;
    timestamp: string;
    description?: string;
    from?: string;
    to?: string;
    reference?: string;
    canFulfill?: boolean;
    truckName?: string;
    quantity?: number;
    operatingCostPerDay?: number;
    maximumLoad?: number;
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
            if (!notification.description) {
                throw new AppError('Payment notification description is missing. Cannot link to an invoice/pickup.', 400);
            }

            const pickupByInvoice = await this.pickupService.getPickupByInvoiceReference(notification.description);

            if (!pickupByInvoice || !pickupByInvoice.invoice) {
                logger.warn(`No pickup or invoice found for reference: ${notification.description}. Skipping processing.`);
                throw new AppError(`No pickup or invoice found for reference: ${notification.description}.`, 404);
            }

            if (pickupByInvoice.invoice && notification.amount < pickupByInvoice.invoice.total_amount) {
                logger.warn(`Received insufficient payment for invoice ${notification.description}. Expected: ${pickupByInvoice.invoice.total_amount}, Received: ${notification.amount}`);
                throw new AppError('Insufficient payment received.', 400);
            }

            if (pickupByInvoice.invoice && notification.amount > pickupByInvoice.invoice.total_amount) {
              logger.warn(`Received overpayment for invoice ${notification.description}. Expected: ${pickupByInvoice.invoice.total_amount}, Received: ${notification.amount}. Processing as successful.`);
          }

            const paidPickup = await this.pickupService.markPickupAndInvoiceAsPaid(notification.description);
            logger.info(`Invoice ${notification.description} and Pickup ${paidPickup.pickup_id} marked as PAID_TO_LOGISTICS_CO based on webhook notification.`);

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

        // truck fulfillment notifications
        if (
          notification.canFulfill === true &&
          notification.truckName &&
          notification.quantity &&
          notification.operatingCostPerDay !== undefined &&
          notification.maximumLoad !== undefined
        ) {
            const truckManagementService = new TruckManagementService(new TruckRepository());
            const truckType = await truckManagementService.getTruckTypeByName(notification.truckName);

            if (!truckType) {
                logger.error(`[Webhook] Truck type not found: ${notification.truckName}`);
                throw new AppError('Truck type not found', 404);
            }

            await truckManagementService.createTruck({
                truckTypeId: truckType.truck_type_id,
                maxPickups: 250,
                maxDropoffs: 500,
                dailyOperatingCost: notification.operatingCostPerDay,
                maxCapacity: notification.maximumLoad,
                isAvailable: true,
                quantity: notification.quantity,
            });

            logger.info(`[Webhook] Registered ${notification.quantity} x ${notification.truckName} from fulfillment webhook.`);
        } else if (notification.canFulfill === true) {
            throw new AppError('Missing required truck fulfillment fields in webhook payload.', 400);
        }
    }
}