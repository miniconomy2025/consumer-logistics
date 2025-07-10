import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient, SQS_PICKUP_QUEUE_URL, SQS_DELIVERY_QUEUE_URL } from '../config/awsSqs';
import { logger } from '../utils/logger';
import { LogisticsPlanningService } from './logisticsPlanningService';
import { TimeManager } from './timeManager';
import { LogisticsStatus } from '../database/models/LogisticsDetailsEntity';
import { AppError } from '../shared/errors/ApplicationError';
import { PickupStatusEnum } from '../database/models/PickupEntity';
import { PickupService } from './pickupService';
import * as https from 'https';
import { URL } from 'url';
import { In } from 'typeorm';

interface SQSMessageBody {
    eventType: 'COLLECTION_SCHEDULED' | 'DELIVERY_SCHEDULED';
    logisticsDetailsId: number;
}

interface WebhookPayload {
    modelName:string;
    status: string;
    quantity: number;
    delivery_reference: string;
}

export class SQSWorkerService {
    private sqsClient: SQSClient;
    private logisticsPlanningService: LogisticsPlanningService;
    private timeManager: TimeManager;
    private pickupService: PickupService;

    private pollingIntervalMs: number = 5000;
    private readonly DELIVERY_SUCCESS_WEBHOOK_URL: string;
    private readonly MAX_RETRY_ATTEMPTS: number = 3;
    private readonly WEBHOOK_TIMEOUT_MS: number = 10000;

    // Company-specific webhook base URLs
    private readonly COMPANY_WEBHOOK_URLS: Record<string, { delivery: string; collection: string }> = {
        'pear': {
            delivery: 'https://pear-company-api.projects.bbdgrad.com/api/logistics/notification',
            collection: 'https://pear-company-api.projects.bbdgrad.com/api/logistics'
        },
        'recycler': {
            delivery: 'https://recycler-api.projects.bbdgrad.com/logistics/notification',
            collection: 'https://recycler-api.projects.bbdgrad.com/logistics'
        },
        'samsung': {
            delivery: 'https://sumsang-phones-api.projects.bbdgrad.com/logistics/notification',
            collection: 'https://sumsang-phones-api.projects.bbdgrad.com/logistics'
        }
    };

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
        this.DELIVERY_SUCCESS_WEBHOOK_URL = process.env.DELIVERY_WEBHOOK_URL || 
            'https://webhook.site/948ae0f0-871f-427d-a745-c13e0345dff7';
        
        logger.info('SQSWorkerService initialized.', {
            webhookUrl: this.DELIVERY_SUCCESS_WEBHOOK_URL,
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

    /**
     * Get the appropriate webhook URL based on company name and notification type
     */
    private getWebhookUrl(companyName: string, notificationType: 'delivery' | 'collection'): string {
        const companyConfig = this.COMPANY_WEBHOOK_URLS[companyName];

        if (companyConfig) {
            logger.debug(`Using company-specific webhook URL for ${companyName}: ${companyConfig[notificationType]}`);
            return companyConfig[notificationType];
        }

        // Fallback to default webhook URL for delivery notifications
        if (notificationType === 'delivery') {
            logger.debug(`Using default delivery webhook URL for company: ${companyName}`);
            return this.DELIVERY_SUCCESS_WEBHOOK_URL;
        }

        // For collection notifications, use a default collection URL or the same delivery URL
        const defaultCollectionUrl = process.env.COLLECTION_WEBHOOK_URL || this.DELIVERY_SUCCESS_WEBHOOK_URL;
        logger.debug(`Using default collection webhook URL for company: ${companyName}`);
        return defaultCollectionUrl;
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

                await this.sendDeliveryWebhook(deliveredLogistics);
            } else {
                logger.warn(`Delivery ${messageBody.logisticsDetailsId} status: ${deliveredLogistics.logistics_status}. Not sending webhook.`);
            }

            await this.deleteMessageFromQueue(SQS_DELIVERY_QUEUE_URL, message.ReceiptHandle);
        } catch (processError) {
            logger.error(`Error processing delivery message for Logistics ID ${messageBody.logisticsDetailsId}:`, processError);
            await this.handleDeliveryProcessingError(messageBody.logisticsDetailsId, processError);
        }
    }

    private async sendDeliveryWebhook(deliveredLogistics: any): Promise<void> {
        const pickup = deliveredLogistics.pickup;
        if (!pickup) {
            logger.warn(`No pickup data found for logistics detail ${deliveredLogistics.logistics_details_id}`);
            return;
        }

        const companyName = pickup.company.company_name || 'Unknown';
        const webhookUrl = this.getWebhookUrl(companyName, 'delivery');

        const webhookPayload: WebhookPayload = {
            status: 'success',
            modelName: pickup?.model_name,
            quantity: pickup.phone_units ?? 0,
            delivery_reference: pickup.invoice.reference_number ?? 'Unknown',
        };

        logger.info('Sending delivery webhook', {
            logisticsId: deliveredLogistics.logistics_details_id,
            companyName: companyName,
            webhookUrl: webhookUrl,
            payload: webhookPayload
        });

        try {
            await this.sendWebhookWithRetry(webhookPayload, webhookUrl);
            logger.info(`Webhook sent successfully for logistics ${deliveredLogistics.logistics_details_id} to ${companyName}`);
        } catch (error) {
            logger.error(`Failed to send webhook for logistics ${deliveredLogistics.logistics_details_id} to ${companyName}:`, error);
            // Consider adding to a dead letter queue for failed webhooks
        }
    }

    private async sendWebhookWithRetry(payload: WebhookPayload, webhookUrlString?: string, attempt: number = 1): Promise<void> {
        return new Promise((resolve, reject) => {
            const webhookUrl = new URL(webhookUrlString || this.DELIVERY_SUCCESS_WEBHOOK_URL);
            const postData = JSON.stringify(payload);

            const options = {
                hostname: webhookUrl.hostname,
                port: webhookUrl.port || (webhookUrl.protocol === 'https:' ? 443 : 80),
                path: webhookUrl.pathname + webhookUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'SQSWorkerService/1.0',
                },
                timeout: this.WEBHOOK_TIMEOUT_MS,
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        const error = new Error(`Webhook failed with status ${res.statusCode}: ${data}`);
                        if (attempt < this.MAX_RETRY_ATTEMPTS) {
                            logger.warn(`Webhook attempt ${attempt} failed, retrying...`, error);
                            setTimeout(() => {
                                this.sendWebhookWithRetry(payload, webhookUrlString, attempt + 1).then(resolve).catch(reject);
                            }, 1000 * Math.pow(2, attempt)); // Exponential backoff
                        } else {
                            reject(error);
                        }
                    }
                });
            });

            req.on('error', (error) => {
                if (attempt < this.MAX_RETRY_ATTEMPTS) {
                    logger.warn(`Webhook attempt ${attempt} failed, retrying...`, error);
                    setTimeout(() => {
                        this.sendWebhookWithRetry(payload, webhookUrlString, attempt + 1).then(resolve).catch(reject);
                    }, 1000 * Math.pow(2, attempt));
                } else {
                    reject(error);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                const error = new Error('Webhook request timed out');
                if (attempt < this.MAX_RETRY_ATTEMPTS) {
                    logger.warn(`Webhook attempt ${attempt} timed out, retrying...`);
                    setTimeout(() => {
                        this.sendWebhookWithRetry(payload, webhookUrlString, attempt + 1).then(resolve).catch(reject);
                    }, 1000 * Math.pow(2, attempt));
                } else {
                    reject(error);
                }
            });

            req.write(postData);
            req.end();
        });
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

        // Wait for active pollers to finish
        const maxWaitTime = 30000; // 30 seconds
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

    // Public method to get service status
    public getStatus(): { isRunning: boolean; activePollers: string[]; isShuttingDown: boolean } {
        return {
            isRunning: this.activePollers.size > 0,
            activePollers: Array.from(this.activePollers),
            isShuttingDown: this.isShuttingDown
        };
    }
}