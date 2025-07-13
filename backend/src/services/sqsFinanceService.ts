import { sqsClient, FINANCIAL_NOTIFICATION_QUEUE_URL } from '../config/awsSqs';
import { logger } from '../utils/logger';
import { LogisticsPlanningService } from './logisticsPlanningService';
import { TimeManager } from './timeManager';
import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

export class PickupQueueWorker {
    constructor(
        private logisticsPlanningService: LogisticsPlanningService,
        private timeManager: TimeManager
    ) {}

    public async startPolling(): Promise<void> {
        logger.info(`Starting SQS pickup queue polling... ${FINANCIAL_NOTIFICATION_QUEUE_URL}`,);

        while (true) {
            try {
                const command = new ReceiveMessageCommand({
                    QueueUrl: FINANCIAL_NOTIFICATION_QUEUE_URL,
                    MaxNumberOfMessages: 10,
                    WaitTimeSeconds: 5,
                  });
                  

                const response = await sqsClient.send(command);

                if (!response.Messages || response.Messages.length === 0) {
                    logger.info('No messages received from queue.');
                    continue;
                }

                for (const message of response.Messages) {
                    try {
                        const pickup = JSON.parse(message.Body!);

                        if (!pickup?.id || typeof pickup.phoneUnits !== 'number') {
                            logger.warn('Invalid pickup message structure:', pickup);
                            continue;
                        }

                        logger.info(`Received pickup ID ${pickup.id} with ${pickup.phoneUnits} units`);

                        const pickupDate = this.calculateNextPickupDate(this.timeManager.getCurrentTime());

                        await this.logisticsPlanningService.planNewCollectionAfterPayment(
                            pickup.id,
                            pickup.phoneUnits,
                            pickupDate
                        );

                        logger.info(`Scheduled pickup ${pickup.id} for ${pickupDate.toISOString()}`);

                        await sqsClient.send(new DeleteMessageCommand({
                            QueueUrl: FINANCIAL_NOTIFICATION_QUEUE_URL,
                            ReceiptHandle: message.ReceiptHandle!
                          }));
                          

                        logger.debug(`Deleted message for pickup ${pickup.id}`);
                    } catch (err) {
                        logger.error(`Failed to process pickup message:`, err);
                    }
                }
            } catch (err) {
                logger.error('Error polling SQS queue:', err);
                await this.sleep(10000); 
            }
        }
    }

    private calculateNextPickupDate(currentTime: Date): Date {
        const isMidnight =
            currentTime.getUTCHours() === 0 &&
            currentTime.getUTCMinutes() === 0 &&
            currentTime.getUTCSeconds() === 0 &&
            currentTime.getUTCMilliseconds() === 0;

        const baseDate = new Date(Date.UTC(currentTime.getUTCFullYear(), currentTime.getUTCMonth(), currentTime.getUTCDate(), 0, 0, 0, 0));
        return isMidnight ? baseDate : new Date(baseDate.getTime() + 24 * 60 * 60 * 1000); // +1 day
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
