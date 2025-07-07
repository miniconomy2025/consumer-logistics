import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient, SQS_PICKUP_QUEUE_URL, SQS_DELIVERY_QUEUE_URL } from '../config/awsSqs';
import { logger } from '../utils/logger';
import { LogisticsPlanningService } from './logisticsPlanningService';
import { SimulationService } from './simulationService';
import { LogisticsStatus } from '../database/models/LogisticsDetailsEntity';
import { AppError } from '../shared/errors/ApplicationError';
import { PickupStatusEnum } from '../database/models/PickupEntity';
import { PickupService } from './pickupService';
import * as https from 'https';
import { URL } from 'url';

interface SQSMessageBody {
  eventType: 'COLLECTION_SCHEDULED' | 'DELIVERY_SCHEDULED';
  logisticsDetailsId: number;
}

export class SQSWorkerService {
  private sqsClient: SQSClient;
  private logisticsPlanningService: LogisticsPlanningService;
  private simulationService: SimulationService;
  private pickupService: PickupService;

  private pollingIntervalMs: number = 5000;
  private readonly DELIVERY_SUCCESS_WEBHOOK_URL: string;

  constructor(
    logisticsPlanningService: LogisticsPlanningService,
    simulationService: SimulationService,
    pickupService: PickupService,
    sqsClientInstance: SQSClient = sqsClient
  ) {
    this.logisticsPlanningService = logisticsPlanningService;
    this.simulationService = simulationService;
    this.pickupService = pickupService;
    this.sqsClient = sqsClientInstance;
    this.DELIVERY_SUCCESS_WEBHOOK_URL = 'https://975a-41-121-32-65.ngrok-free.app/webhook';
  }

  public startPollingPickupQueue(): void {
    logger.info(`Starting SQS Pickup Queue Poller for ${SQS_PICKUP_QUEUE_URL}`);
    this.pollPickupQueue();
  }

  private async pollPickupQueue(): Promise<void> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: SQS_PICKUP_QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 300,
      });

      const { Messages } = await this.sqsClient.send(command);

      if (Messages && Messages.length > 0) {
        for (const message of Messages) {
          if (!message.Body || !message.ReceiptHandle) {
            logger.warn('Received SQS message with empty body or no ReceiptHandle. Skipping.');
            continue;
          }

          let messageBody: SQSMessageBody;
          try {
            messageBody = JSON.parse(message.Body);
          } catch (parseError) {
            logger.error(`Failed to parse SQS message body for ReceiptHandle ${message.ReceiptHandle}:`, parseError);
            await this.deleteMessageFromQueue(SQS_PICKUP_QUEUE_URL, message.ReceiptHandle);
            continue;
          }

          logger.info(`Processing Pickup message for Logistics ID: ${messageBody.logisticsDetailsId}`);

          try {
            const collectedLogistics = await this.logisticsPlanningService.markAsCollected(messageBody.logisticsDetailsId);

            const fullLogisticsForDelivery = await this.logisticsPlanningService.logisticsDetailsRepository.findById(collectedLogistics.logistics_details_id);
            if (!fullLogisticsForDelivery || !fullLogisticsForDelivery.scheduled_real_delivery_timestamp) {
              throw new AppError(`Scheduled delivery time not found for logistics detail ${collectedLogistics.logistics_details_id}.`, 500);
            }

            const targetDeliveryTime = fullLogisticsForDelivery.scheduled_real_delivery_timestamp;
            const now = new Date();
            const realWorldDeliveryDelaySeconds = Math.max(0, Math.floor((targetDeliveryTime.getTime() - now.getTime()) / 1000));

            await this.logisticsPlanningService.sendDeliveryMessageToSQS(fullLogisticsForDelivery.logistics_details_id, realWorldDeliveryDelaySeconds);
            await this.logisticsPlanningService.logisticsDetailsRepository.update(fullLogisticsForDelivery.logistics_details_id, {
              logistics_status: LogisticsStatus.QUEUED_FOR_DELIVERY,
            });

            logger.info(`Delivery for Logistics ID ${fullLogisticsForDelivery.logistics_details_id} queued to DELIVERY SQS with ${realWorldDeliveryDelaySeconds}s delay, targeting real time: ${targetDeliveryTime.toLocaleTimeString()}.`);

            await this.deleteMessageFromQueue(SQS_PICKUP_QUEUE_URL, message.ReceiptHandle);
          } catch (processError) {
            logger.error(`Error processing SQS message for Logistics ID ${messageBody.logisticsDetailsId}:`, processError);
            const logisticsDetail = await this.logisticsPlanningService.logisticsDetailsRepository.findById(messageBody.logisticsDetailsId);
            if (logisticsDetail && logisticsDetail.pickup?.pickup_id) {
              await this.logisticsPlanningService.logisticsDetailsRepository.update(logisticsDetail.logistics_details_id, { logistics_status: LogisticsStatus.FAILED });
              await this.pickupService.updatePickupStatus(logisticsDetail.pickup.pickup_id, PickupStatusEnum.FAILED);
              logger.error(`Logistics/Pickup for ID ${logisticsDetail.pickup.pickup_id} marked as FAILED due to processing error.`);
            }
          }
        }
      }
    } catch (queueError) {
      logger.error('Error polling SQS Pickup queue:', queueError);
    } finally {
      setTimeout(() => this.pollPickupQueue(), this.pollingIntervalMs);
    }
  }

  public startPollingDeliveryQueue(): void {
    logger.warn('Starting delivery queue poller...');
    logger.info(`Starting SQS Delivery Queue Poller for ${SQS_DELIVERY_QUEUE_URL}`);
    this.pollDeliveryQueue();
  }

  private async pollDeliveryQueue(): Promise<void> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: SQS_DELIVERY_QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 300,
      });

      const { Messages } = await this.sqsClient.send(command);

      if (Messages && Messages.length > 0) {
        for (const message of Messages) {
          if (!message.Body || !message.ReceiptHandle) {
            logger.warn('Received SQS message with empty body or no ReceiptHandle. Skipping.');
            continue;
          }

          let messageBody: SQSMessageBody;
          try {
            messageBody = JSON.parse(message.Body);
          } catch (parseError) {
            logger.error(`Failed to parse SQS message body for ReceiptHandle ${message.ReceiptHandle}:`, parseError);
            await this.deleteMessageFromQueue(SQS_DELIVERY_QUEUE_URL, message.ReceiptHandle);
            continue;
          }

          logger.info(`Processing Delivery message for Logistics ID: ${messageBody.logisticsDetailsId}`);

          try {
            const deliveredLogistics = await this.logisticsPlanningService.markAsDelivered(messageBody.logisticsDetailsId);

            const assignedTruckId = deliveredLogistics.truckAllocations?.[0]?.truck_id;
            if (assignedTruckId) {
              logger.info(`Delivery handled by Truck ID: ${assignedTruckId}.`);
            } else {
              logger.warn(`No truck found for Logistics ID ${deliveredLogistics.logistics_details_id} via TruckAllocation.`);
            }

            const pickup = deliveredLogistics.pickup;
            logger.info(`Delivery for Logistics ID ${deliveredLogistics.logistics_details_id} completed.`);
            logger.info(`Pickup status: ${pickup?.pickup_status?.status_name}`);
            logger.info(`Invoice payment status: ${pickup?.invoice?.paid ? 'Paid' : 'Unpaid'}`);

            if (pickup) {
              const webhookPayload = {
                status: 'delivered',
                deliveryFrom: pickup.company?.company_name || pickup.pickup_location || 'Unknown Company',
                deliveryTo: pickup.recipient_name || pickup.delivery_location || 'Unknown Recipient',
                units: pickup.phone_units ?? 0,
                deliveryDate: deliveredLogistics.scheduled_real_simulated_delivery_timestamp?.toISOString() || new Date().toISOString(),
              };

              logger.warn('Sending Webhook Payload:', webhookPayload);

              try {
                const webhookUrl = new URL(this.DELIVERY_SUCCESS_WEBHOOK_URL);
                const postData = JSON.stringify(webhookPayload);

                const options = {
                  hostname: webhookUrl.hostname,
                  port: webhookUrl.port || (webhookUrl.protocol === 'https:' ? 443 : 80),
                  path: webhookUrl.pathname + webhookUrl.search,
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                  },
                };

                const req = https.request(options, (res) => {
                  let data = '';
                  res.on('data', (chunk) => (data += chunk));
                  res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                      logger.info(`Webhook sent successfully. Status: ${res.statusCode}`);
                    } else {
                      logger.error(`Webhook failed. Status: ${res.statusCode}, Response: ${data}`);
                    }
                  });
                });

                req.on('error', (e) => {
                  logger.error(`Webhook send error: ${e.message}`);
                });

                req.write(postData);
                req.end();
              } catch (e: any) {
                logger.error(`Webhook construction/sending error: ${e.message}`);
              }
            } else {
              logger.warn(`No pickup data found for logistics detail ${deliveredLogistics.logistics_details_id}`);
            }

            await this.deleteMessageFromQueue(SQS_DELIVERY_QUEUE_URL, message.ReceiptHandle);
          } catch (processError) {
            logger.error(`Error processing SQS message for Logistics ID ${messageBody.logisticsDetailsId}:`, processError);
            const logisticsDetail = await this.logisticsPlanningService.logisticsDetailsRepository.findById(messageBody.logisticsDetailsId);
            if (logisticsDetail?.pickup?.pickup_id) {
              await this.logisticsPlanningService.logisticsDetailsRepository.update(logisticsDetail.logistics_details_id, { logistics_status: LogisticsStatus.FAILED });
              await this.pickupService.updatePickupStatus(logisticsDetail.pickup.pickup_id, PickupStatusEnum.FAILED);
              logger.error(`Logistics/Pickup for ID ${logisticsDetail.pickup.pickup_id} marked as FAILED.`);
            }
          }
        }
      }
    } catch (queueError) {
      logger.error('Error polling SQS Delivery queue:', queueError);
    } finally {
      setTimeout(() => this.pollDeliveryQueue(), this.pollingIntervalMs);
    }
  }

  private async deleteMessageFromQueue(queueUrl: string, receiptHandle: string): Promise<void> {
    const deleteCommand = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });
    try {
      await this.sqsClient.send(deleteCommand);
    } catch (error) {
      logger.error(`Failed to delete message with ReceiptHandle ${receiptHandle} from ${queueUrl}:`, error);
    }
  }
}
