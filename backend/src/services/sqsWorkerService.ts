import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient, SQS_PICKUP_QUEUE_URL, SQS_DELIVERY_QUEUE_URL } from '../config/awsSqs';
import { logger } from '../utils/logger';
import { LogisticsPlanningService } from './logisticsPlanningService';
import { TimeManager } from './timeManager';
import { LogisticsStatus } from '../database/models/LogisticsDetailsEntity';
import { AppError } from '../shared/errors/ApplicationError';
import { PickupStatusEnum } from '../database/models/PickupEntity';
import { PickupService } from './pickupService';
import { In } from 'typeorm';
 
interface SQSMessageBody {
    eventType: 'COLLECTION_SCHEDULED' | 'DELIVERY_SCHEDULED';
    logisticsDetailsId: number;
}
 
export class SQSWorkerService {
    private sqsClient: SQSClient;
    private logisticsPlanningService: LogisticsPlanningService;
    private timeManager: TimeManager;
    private pickupService: PickupService;
 
    private pollingIntervalMs: number = 5000;
 
    // Track shutdown state
    private isShuttingDown: boolean = false;
    private activePollers: Set<string> = new Set();
 
    constructor(
        logisticsPlanningService: LogisticsPlanningService,
        timeManager: TimeManager,
        pickupService: PickupService,
        sqsClientInstance: SQSClient = sqsClient
    ) {
        this.logisticsPlanningService = logisticsPlanningService;
        this.timeManager = timeManager;
        this.pickupService = pickupService;
        this.sqsClient = sqsClientInstance;
       
        logger.info('SQSWorkerService initialized.', {
            pollingInterval: this.pollingIntervalMs
        });
 
        // Bind methods
        this.pollPickupQueue = this.pollPickupQueue.bind(this);
        this.pollDeliveryQueue = this.pollDeliveryQueue.bind(this);
        this.deleteMessageFromQueue = this.deleteMessageFromQueue.bind(this);
 
        // Register TimeManager callbacks
        this.timeManager.onMidnight(async (simTime: Date) => {
            logger.info(`[SQSWorkerService] Midnight event for sim-day: ${simTime.toISOString().split('T')[0]}. Checking for replanning/stuck items.`);
            await this.reattemptFailedPlanning(simTime);
        });
 
        this.timeManager.onBeforeMidnight(async (simTime: Date) => {
            logger.debug(`[SQSWorkerService] Pre-midnight event for sim-day: ${simTime.toISOString().split('T')[0]}`);
        });
 
        // Handle graceful shutdown
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('SIGINT', () => this.gracefulShutdown());
    }
 
    public startPollingPickupQueue(): void {
        if (this.isShuttingDown) {
            logger.warn('Cannot start pickup queue polling - service is shutting down');
            return;
        }
 
        logger.info(`Starting SQS Pickup Queue Poller for ${SQS_PICKUP_QUEUE_URL}`);
        this.activePollers.add('pickup');
        this.pollPickupQueue();
    }
 
    public startPollingDeliveryQueue(): void {
        if (this.isShuttingDown) {
            logger.warn('Cannot start delivery queue polling - service is shutting down');
            return;
        }
 
        logger.info(`Starting SQS Delivery Queue Poller for ${SQS_DELIVERY_QUEUE_URL}`);
        this.activePollers.add('delivery');
        this.pollDeliveryQueue();
    }
 
    private async pollPickupQueue(): Promise<void> {
        if (this.isShuttingDown) {
            this.activePollers.delete('pickup');
            return;
        }
 
        try {
            const command = new ReceiveMessageCommand({
                QueueUrl: SQS_PICKUP_QUEUE_URL,
                MaxNumberOfMessages: 10, // Process multiple messages at once
                WaitTimeSeconds: 20,
                VisibilityTimeout: 300,
                MessageAttributeNames: ['All'], // Include message attributes
            });
 
            const { Messages } = await this.sqsClient.send(command);
 
            if (Messages && Messages.length > 0) {
                logger.info(`Received ${Messages.length} pickup messages`);
               
                // Process messages in parallel with controlled concurrency
                const processingPromises = Messages.map(message =>
                    this.processPickupMessage(message).catch(error => {
                        logger.error('Error processing pickup message:', error);
                    })
                );
 
                await Promise.allSettled(processingPromises);
            }
        } catch (queueError) {
            logger.error('Error polling SQS Pickup queue:', queueError);
        } finally {
            if (!this.isShuttingDown) {
                setTimeout(this.pollPickupQueue, this.pollingIntervalMs);
            } else {
                this.activePollers.delete('pickup');
            }
        }
    }
 
    private async pollDeliveryQueue(): Promise<void> {
        if (this.isShuttingDown) {
            this.activePollers.delete('delivery');
            return;
        }
 
        try {
            const command = new ReceiveMessageCommand({
                QueueUrl: SQS_DELIVERY_QUEUE_URL,
                MaxNumberOfMessages: 10,
                WaitTimeSeconds: 20,
                VisibilityTimeout: 300,
                MessageAttributeNames: ['All'],
            });
 
            const { Messages } = await this.sqsClient.send(command);
 
            if (Messages && Messages.length > 0) {
                logger.info(`Received ${Messages.length} delivery messages`);
               
                const processingPromises = Messages.map(message =>
                    this.processDeliveryMessage(message).catch(error => {
                        logger.error('Error processing delivery message:', error);
                    })
                );
 
                await Promise.allSettled(processingPromises);
            }
        } catch (queueError) {
            logger.error('Error polling SQS Delivery queue:', queueError);
        } finally {
            if (!this.isShuttingDown) {
                setTimeout(this.pollDeliveryQueue, this.pollingIntervalMs);
            } else {
                this.activePollers.delete('delivery');
            }
        }
    }
 
    private async processPickupMessage(message: any): Promise<void> {
        if (!message.Body || !message.ReceiptHandle) {
            logger.warn('Received SQS message with empty body or no ReceiptHandle. Skipping.');
            return;
        }
 
        let messageBody: SQSMessageBody;
        try {
            messageBody = JSON.parse(message.Body);
        } catch (parseError) {
            logger.error(`Failed to parse SQS message body for ReceiptHandle ${message.ReceiptHandle}:`, parseError);
            await this.deleteMessageFromQueue(SQS_PICKUP_QUEUE_URL, message.ReceiptHandle);
            return;
        }
 
        const startTime = Date.now();
        logger.info(`Processing Pickup message for Logistics ID: ${messageBody.logisticsDetailsId}`);
 
        try {
            const collectedLogistics = await this.logisticsPlanningService.markAsCollected(messageBody.logisticsDetailsId);
 
            if (collectedLogistics.logistics_status === LogisticsStatus.COLLECTED) {
                const fullLogisticsForDelivery = await this.logisticsPlanningService.logisticsDetailsRepository.findById(collectedLogistics.logistics_details_id);
               
                if (!fullLogisticsForDelivery?.scheduled_time) {
                    throw new AppError(`Scheduled delivery time not found for logistics detail ${collectedLogistics.logistics_details_id}.`, 500);
                }
 
                const targetDeliveryRealWorldTime = this.timeManager.getRealWorldDeliveryTimestamp(fullLogisticsForDelivery.scheduled_time);
                const now = new Date();
                const realWorldDeliveryDelaySeconds = Math.max(0, Math.floor((targetDeliveryRealWorldTime.getTime() - now.getTime()) / 1000));
 
                await this.logisticsPlanningService.sendDeliveryMessageToSQS(fullLogisticsForDelivery.logistics_details_id, realWorldDeliveryDelaySeconds);
                await this.logisticsPlanningService.logisticsDetailsRepository.update(fullLogisticsForDelivery.logistics_details_id, {
                    logistics_status: LogisticsStatus.QUEUED_FOR_DELIVERY,
                });
               
                logger.info(`Delivery queued for Logistics ID ${fullLogisticsForDelivery.logistics_details_id} with ${realWorldDeliveryDelaySeconds}s delay`, {
                    processingTimeMs: Date.now() - startTime
                });
            } else {
                logger.warn(`Pickup ${messageBody.logisticsDetailsId} status: ${collectedLogistics.logistics_status}. Not queuing for delivery.`);
            }
 
            await this.deleteMessageFromQueue(SQS_PICKUP_QUEUE_URL, message.ReceiptHandle);
        } catch (processError) {
            logger.error(`Error processing pickup message for Logistics ID ${messageBody.logisticsDetailsId}:`, processError);
            await this.handlePickupProcessingError(messageBody.logisticsDetailsId, processError);
        }
    }
 
    private async processDeliveryMessage(message: any): Promise<void> {
        if (!message.Body || !message.ReceiptHandle) {
            logger.warn('Received SQS message with empty body or no ReceiptHandle. Skipping.');
            return;
        }
 
        let messageBody: SQSMessageBody;
        try {
            messageBody = JSON.parse(message.Body);
        } catch (parseError) {
            logger.error(`Failed to parse SQS message body for ReceiptHandle ${message.ReceiptHandle}:`, parseError);
            await this.deleteMessageFromQueue(SQS_DELIVERY_QUEUE_URL, message.ReceiptHandle);
            return;
        }
 
        const startTime = Date.now();
        logger.info(`Processing Delivery message for Logistics ID: ${messageBody.logisticsDetailsId}`);
 
        try {
            const deliveredLogistics = await this.logisticsPlanningService.markAsDelivered(messageBody.logisticsDetailsId);
 
            if (deliveredLogistics.logistics_status === LogisticsStatus.DELIVERED) {
                const assignedTruckId = deliveredLogistics.truckAllocations?.[0]?.truck_id;
                logger.info(`Delivery completed for Logistics ID ${deliveredLogistics.logistics_details_id}`, {
                    truckId: assignedTruckId,
                    processingTimeMs: Date.now() - startTime
                });
            } else {
                logger.warn(`Delivery ${messageBody.logisticsDetailsId} status: ${deliveredLogistics.logistics_status}.`);
            }
 
            await this.deleteMessageFromQueue(SQS_DELIVERY_QUEUE_URL, message.ReceiptHandle);
        } catch (processError) {
            logger.error(`Error processing delivery message for Logistics ID ${messageBody.logisticsDetailsId}:`, processError);
            await this.handleDeliveryProcessingError(messageBody.logisticsDetailsId, processError);
        }
    }
 
    private async handlePickupProcessingError(logisticsDetailsId: number, error: any): Promise<void> {
        try {
            const logisticsDetail = await this.logisticsPlanningService.logisticsDetailsRepository.findById(logisticsDetailsId);
            if (logisticsDetail?.pickup?.pickup_id) {
                const replanningStatuses = [
                    LogisticsStatus.TRUCK_UNAVAILABLE,
                    LogisticsStatus.NO_TRUCKS_AVAILABLE,
                    LogisticsStatus.PENDING_REPLANNING,
                    LogisticsStatus.STUCK_IN_TRANSIT
                ];
 
                if (!replanningStatuses.includes(logisticsDetail.logistics_status)) {
                    await this.logisticsPlanningService.logisticsDetailsRepository.update(logisticsDetail.logistics_details_id, {
                        logistics_status: LogisticsStatus.FAILED
                    });
                    await this.pickupService.updatePickupStatus(logisticsDetail.pickup.pickup_id, PickupStatusEnum.FAILED);
                    logger.error(`Pickup ${logisticsDetail.pickup.pickup_id} marked as FAILED due to processing error`);
                } else {
                    logger.info(`Pickup ${logisticsDetail.pickup.pickup_id} in replanning state (${logisticsDetail.logistics_status}). Not marking as FAILED.`);
                }
            }
        } catch (updateError) {
            logger.error('Error updating pickup status after processing error:', updateError);
        }
    }
 
    private async handleDeliveryProcessingError(logisticsDetailsId: number, error: any): Promise<void> {
        try {
            const logisticsDetail = await this.logisticsPlanningService.logisticsDetailsRepository.findById(logisticsDetailsId);
            if (logisticsDetail?.pickup?.pickup_id) {
                const replanningStatuses = [
                    LogisticsStatus.TRUCK_UNAVAILABLE,
                    LogisticsStatus.NO_TRUCKS_AVAILABLE,
                    LogisticsStatus.PENDING_REPLANNING,
                    LogisticsStatus.STUCK_IN_TRANSIT,
                    LogisticsStatus.ALTERNATIVE_DELIVERY_PLANNED
                ];
 
                if (!replanningStatuses.includes(logisticsDetail.logistics_status)) {
                    await this.logisticsPlanningService.logisticsDetailsRepository.update(logisticsDetail.logistics_details_id, {
                        logistics_status: LogisticsStatus.FAILED
                    });
                    await this.pickupService.updatePickupStatus(logisticsDetail.pickup.pickup_id, PickupStatusEnum.FAILED);
                    logger.error(`Delivery ${logisticsDetail.pickup.pickup_id} marked as FAILED`);
                } else {
                    logger.info(`Delivery ${logisticsDetail.pickup.pickup_id} in replanning state (${logisticsDetail.logistics_status}). Not marking as FAILED.`);
                }
            }
        } catch (updateError) {
            logger.error('Error updating delivery status after processing error:', updateError);
        }
    }
 
    private async deleteMessageFromQueue(queueUrl: string, receiptHandle: string): Promise<void> {
        const deleteCommand = new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle,
        });
       
        try {
            await this.sqsClient.send(deleteCommand);
            logger.debug(`Message deleted from ${queueUrl}`);
        } catch (error) {
            logger.error(`Failed to delete message from ${queueUrl}:`, error);
            throw error; // Re-throw to allow caller to handle
        }
    }
 
    private async reattemptFailedPlanning(simTime: Date): Promise<void> {
        const statuses = [
            LogisticsStatus.NO_TRUCKS_AVAILABLE,
            LogisticsStatus.PENDING_REPLANNING,
            LogisticsStatus.TRUCK_UNAVAILABLE,
            LogisticsStatus.STUCK_IN_TRANSIT,
            LogisticsStatus.ALTERNATIVE_DELIVERY_PLANNED,
            LogisticsStatus.FAILED
        ];
 
        logger.info(`[Scheduler] Re-attempting planning for logistics with statuses: ${statuses.join(', ')}`);
 
        try {
            const logisticsToReplan = await this.logisticsPlanningService.logisticsDetailsRepository.find({
                where: { logistics_status: In(statuses) },
                relations: ['pickup']
            });
 
            if (logisticsToReplan.length === 0) {
                logger.info('No logistics details found requiring re-planning.');
                return;
            }
 
            logger.info(`Found ${logisticsToReplan.length} logistics details to re-plan.`);
 
            // Process in batches to avoid overwhelming the system
            const batchSize = 10;
            for (let i = 0; i < logisticsToReplan.length; i += batchSize) {
                const batch = logisticsToReplan.slice(i, i + batchSize);
                await Promise.allSettled(batch.map(detail => this.replanLogisticsDetail(detail)));
            }
        } catch (error) {
            logger.error('Error during failed planning reattempt:', error);
        }
    }
 
    private async replanLogisticsDetail(detail: any): Promise<void> {
        if (!detail.pickup) {
            logger.warn(`Skipping replanning for logistics detail ${detail.logistics_details_id}: No associated pickup.`);
            return;
        }
 
        try {
            logger.info(`Re-planning logistics detail ${detail.logistics_details_id} (Pickup ${detail.pickup.pickup_id}). Status: ${detail.logistics_status}`);
 
            if (detail.logistics_status === LogisticsStatus.STUCK_IN_TRANSIT ||
                detail.logistics_status === LogisticsStatus.ALTERNATIVE_DELIVERY_PLANNED ) {
                await this.logisticsPlanningService.planAlternativeDelivery(detail.logistics_details_id);
            } else {
                await this.logisticsPlanningService.reassignTruckForLogistics(detail.logistics_details_id);
            }
           
            logger.info(`Successfully re-planned logistics detail ${detail.logistics_details_id}`);
        } catch (error) {
            logger.error(`Failed to re-plan logistics detail ${detail.logistics_details_id}:`, error);
        }
    }
 
    private async gracefulShutdown(): Promise<void> {
        logger.info('Initiating graceful shutdown...');
        this.isShuttingDown = true;
 
        const maxWaitTime = 30000;
        const startTime = Date.now();
       
        while (this.activePollers.size > 0 && (Date.now() - startTime) < maxWaitTime) {
            logger.info(`Waiting for ${this.activePollers.size} active pollers to finish...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
 
        if (this.activePollers.size > 0) {
            logger.warn(`Forced shutdown - ${this.activePollers.size} pollers still active`);
        }
 
        logger.info('SQSWorkerService shutdown complete');
        process.exit(0);
    }
 
    public getStatus(): { isRunning: boolean; activePollers: string[]; isShuttingDown: boolean } {
        return {
            isRunning: this.activePollers.size > 0,
            activePollers: Array.from(this.activePollers),
            isShuttingDown: this.isShuttingDown
        };
    }
}
 