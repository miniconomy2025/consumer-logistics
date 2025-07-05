import { Repository, LessThanOrEqual, Between, In } from 'typeorm';
import { AppDataSource } from '../database/config';
import { LogisticsDetailsEntity, LogisticsStatus } from '../database/models/LogisticsDetailsEntity';
import { TruckEntity } from '../database/models/TruckEntity';
import { ServiceTypeEnum, ServiceTypeEntity } from '../database/models/ServiceTypeEntity';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';
import { SimulationService } from './simulationService';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient, SQS_PICKUP_QUEUE_URL, SQS_DELIVERY_QUEUE_URL } from '../config/awsSqs';
import { ILogisticsDetailsRepository } from '../repositories/interfaces/ILogisticsDetailsRepository';
import { LogisticsDetailsRepository } from '../repositories/implementations/LogisticsDetailsRepository';
import { IPickupRepository } from '../repositories/interfaces/IPickupRepository';
import { PickupRepository } from '../repositories/implementations/PickupRepository';
import { PickupEntity, PickupStatusEnum } from '../database/models/PickupEntity';
import { ITruckRepository } from '../repositories/interfaces/ITruckRepository';
import { TruckRepository } from '../repositories/implementations/TruckRepository';
import { ITruckAllocationRepository } from '../repositories/interfaces/ITruckAllocationRepository';
import { TruckAllocationRepository } from '../repositories/implementations/TruckAllocationRepository';

export interface CreateLogisticsDetailsData {
    pickupId: number;
    serviceTypeId: ServiceTypeEnum;
    scheduledSimulationDate: Date;
    quantity: number;
}

export class LogisticsPlanningService {
    public logisticsDetailsRepository: ILogisticsDetailsRepository;
    private truckRepository: ITruckRepository;
    private serviceTypeRepository: Repository<ServiceTypeEntity>;
    private pickupRepository: IPickupRepository;
    private truckAllocationRepository: ITruckAllocationRepository;
    private simulationService: SimulationService;
    private sqsClient: SQSClient;

    constructor(
        simulationService: SimulationService,
        logisticsDetailsRepository: ILogisticsDetailsRepository,
        truckRepository: ITruckRepository,
        pickupRepository: IPickupRepository,
        truckAllocationRepository: ITruckAllocationRepository,
        sqsClientInstance: SQSClient = sqsClient
    ) {
        this.simulationService = simulationService;
        this.logisticsDetailsRepository = logisticsDetailsRepository;
        this.truckRepository = truckRepository;
        this.serviceTypeRepository = AppDataSource.getRepository(ServiceTypeEntity);
        this.pickupRepository = pickupRepository;
        this.truckAllocationRepository = truckAllocationRepository;
        this.sqsClient = sqsClientInstance;
    }

    public async planNewCollection(data: CreateLogisticsDetailsData): Promise<LogisticsDetailsEntity> {
        logger.warn(`planNewCollection called directly for Pickup ID: ${data.pickupId}. This method should primarily be triggered after payment.`);
        throw new AppError("Direct call to deprecated planning method. Use planNewCollectionAfterPayment.", 400);
    }

    public async planNewCollectionAfterPayment(
        pickupId: number,
        quantity: number,
        pickupLocation: string,
        deliveryLocation: string,
        initialInSimPickupDate: Date
    ): Promise<LogisticsDetailsEntity> {
        logger.info(`Planning logistics for Pickup ID: ${pickupId} after payment. Initial Requested In-Sim Pickup Date: ${initialInSimPickupDate.toISOString()}`);
        logger.debug(`Pickup Location: ${pickupLocation}, Delivery Location: ${deliveryLocation}`);

        const pickup = await this.pickupRepository.findById(pickupId);
        if (!pickup) {
            throw new AppError(`Related Pickup with ID ${pickupId} not found. Cannot plan logistics.`, 404);
        }
        if (pickup.logisticsDetails) {
            if (pickup.logisticsDetails.logistics_status === LogisticsStatus.QUEUED_FOR_COLLECTION ||
                pickup.logisticsDetails.logistics_status === LogisticsStatus.COLLECTED ||
                pickup.logisticsDetails.logistics_status === LogisticsStatus.QUEUED_FOR_DELIVERY ||
                pickup.logisticsDetails.logistics_status === LogisticsStatus.DELIVERED) {
                logger.warn(`Pickup ID ${pickupId} already has logistics status ${pickup.logisticsDetails.logistics_status}. Skipping re-planning.`);
                return pickup.logisticsDetails;
            }
        }

        const scheduledLogistics = await this.assignPickupToTruckAndSchedule(
            pickupId,
            quantity,
            initialInSimPickupDate,
            pickupLocation,
            deliveryLocation
        );

        logger.info(`Logistics detail ${scheduledLogistics.logistics_details_id} created/updated for Pickup ${pickupId}.`);
        logger.info(`In-sim Collection Scheduled: ${scheduledLogistics.scheduled_time.toISOString()} (Real-world: ${scheduledLogistics.scheduled_real_pickup_timestamp?.toLocaleTimeString()})`);
        logger.info(`In-sim Delivery Scheduled: ${scheduledLogistics.scheduled_real_delivery_timestamp ? scheduledLogistics.scheduled_real_delivery_timestamp.toISOString() : 'N/A'} (Real-world: ${scheduledLogistics.scheduled_real_delivery_timestamp?.toLocaleTimeString()})`);

        const now = new Date();
        const realWorldDelaySeconds = Math.max(0, Math.floor(((scheduledLogistics.scheduled_real_pickup_timestamp?.getTime() || 0) - now.getTime()) / 1000));

        await this.sendPickupMessageToSQS(scheduledLogistics.logistics_details_id, realWorldDelaySeconds);

        const updatedLogisticsDetail = await this.logisticsDetailsRepository.update(
            scheduledLogistics.logistics_details_id,
            { logistics_status: LogisticsStatus.QUEUED_FOR_COLLECTION }
        );
        if (!updatedLogisticsDetail) {
            throw new AppError(`Failed to update logistics status for ID ${scheduledLogistics.logistics_details_id} after SQS queueing.`, 500);
        }
        logger.info(`Logistics detail ${updatedLogisticsDetail.logistics_details_id} queued to SQS for collection with ${realWorldDelaySeconds}s delay.`);

        await this.pickupRepository.update(pickupId, { pickup_status_id: await this.pickupRepository.getPickupStatusId(PickupStatusEnum.READY_FOR_COLLECTION) });
        logger.info(`Pickup ${pickupId} status updated to READY_FOR_COLLECTION.`);

        return updatedLogisticsDetail;
    }

    public async assignPickupToTruckAndSchedule(
        pickupId: number,
        quantity: number,
        requestedInSimDate: Date,
        pickupLocation: string,
        deliveryLocation: string
    ): Promise<LogisticsDetailsEntity> {
        let currentInSimDate = new Date(requestedInSimDate);
        let assignedTruck: TruckEntity | null = null;
        let savedLogisticsDetail: LogisticsDetailsEntity | null = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 365; 

        let assignedTruckPickupsToday: number = 0; 

        const allTrucks = await this.truckRepository.findAll();
        if (allTrucks.length === 0) {
            throw new AppError('No trucks available in the fleet to assign for this collection. Please add trucks first (e.g., via POST /api/trucks).', 404);
        }

        while (attempts < MAX_ATTEMPTS && !savedLogisticsDetail) {
            logger.debug(`Attempting to schedule pickup ${pickupId} for in-sim date: ${currentInSimDate.toISOString().split('T')[0]}, Attempt: ${attempts + 1}`);

            for (const truck of allTrucks) {
                if (truck.max_capacity < quantity) {
                    logger.debug(`Truck ${truck.truck_id} (capacity: ${truck.max_capacity}) too small for quantity ${quantity}. Skipping for this truck.`);
                    continue;
                }

                const activeLogisticsForTruckToday = await this.logisticsDetailsRepository.findActiveLogisticsForTruckOnDay(truck.truck_id, currentInSimDate);
                const currentPickups = activeLogisticsForTruckToday.length; 

                if (currentPickups >= truck.max_pickups) {
                    logger.debug(`Truck ${truck.truck_id} (max_pickups: ${truck.max_pickups}) already has ${currentPickups} pickups scheduled for ${currentInSimDate.toISOString().split('T')[0]}. Skipping for this truck.`);
                    continue; 
                }
                
                assignedTruck = truck;
                assignedTruckPickupsToday = currentPickups; 
                break; 
            }

            if (assignedTruck) {
                const scheduledRealPickupTime = this.simulationService.getRealWorldPickupTimestamp(currentInSimDate);
                const scheduledRealDeliveryTime = this.simulationService.getRealWorldDeliveryTimestamp(currentInSimDate);

                const newLogisticsDetailData = {
                    pickup_id: pickupId,
                    service_type_id: ServiceTypeEnum.COLLECTION, 
                    scheduled_time: currentInSimDate, 
                    quantity: quantity,
                    logistics_status: LogisticsStatus.PENDING_PLANNING, 
                    scheduled_real_pickup_timestamp: scheduledRealPickupTime,
                    scheduled_real_delivery_timestamp: scheduledRealDeliveryTime,
                };

                savedLogisticsDetail = await this.logisticsDetailsRepository.create(newLogisticsDetailData);
                if (savedLogisticsDetail) {
                    await this.truckAllocationRepository.create(savedLogisticsDetail.logistics_details_id, assignedTruck.truck_id);
                    logger.info(`Pickup ${pickupId} assigned to Truck ID ${assignedTruck.truck_id} for in-sim date ${currentInSimDate.toISOString().split('T')[0]}. Pickup count check: ${assignedTruckPickupsToday + 1}/${assignedTruck.max_pickups}.`);
                }
            }

            if (!savedLogisticsDetail) {
                currentInSimDate = new Date(currentInSimDate); 
                currentInSimDate.setUTCDate(currentInSimDate.getUTCDate() + 1);
                currentInSimDate.setUTCHours(0, 0, 0, 0); 
                attempts++;
                logger.debug(`No available truck for pickup ${pickupId} on ${currentInSimDate.toISOString().split('T')[0]}. Trying next day.`);
            }
        }

        if (!savedLogisticsDetail) {
            throw new AppError(`Could not assign pickup ${pickupId} to any truck after ${MAX_ATTEMPTS} attempts.`, 500);
        }

        return savedLogisticsDetail;
    }


    public async sendPickupMessageToSQS(logisticsDetailsId: number, delaySeconds: number): Promise<void> {
        const messageBody = JSON.stringify({
            eventType: 'COLLECTION_SCHEDULED',
            logisticsDetailsId: logisticsDetailsId,
        });

        const command = new SendMessageCommand({
            QueueUrl: SQS_PICKUP_QUEUE_URL,
            MessageBody: messageBody,
            DelaySeconds: delaySeconds,
        });

        try {
            await this.sqsClient.send(command);
            logger.debug(`Message for Logistics ID ${logisticsDetailsId} sent to SQS Pickup queue with delay ${delaySeconds}s.`);
        } catch (error) {
            logger.error(`Failed to send message for Logistics ID ${logisticsDetailsId} to SQS Pickup queue:`, error);
            throw new AppError('Failed to queue logistics pickup event.', 500);
        }
    }

    public async sendDeliveryMessageToSQS(logisticsDetailsId: number, delaySeconds: number): Promise<void> {
        const messageBody = JSON.stringify({
            eventType: 'DELIVERY_SCHEDULED',
            logisticsDetailsId: logisticsDetailsId,
        });

        const command = new SendMessageCommand({
            QueueUrl: SQS_DELIVERY_QUEUE_URL,
            MessageBody: messageBody,
            DelaySeconds: delaySeconds,
        });

        try {
            await this.sqsClient.send(command);
            logger.debug(`Message for Logistics ID ${logisticsDetailsId} sent to SQS Delivery queue with delay ${delaySeconds}s.`);
        } catch (error) {
            logger.error(`Failed to send message for Logistics ID ${logisticsDetailsId} to SQS Delivery queue:`, error);
            throw new AppError('Failed to queue logistics delivery event.', 500);
        }
    }

    public async markAsCollected(logisticsDetailsId: number): Promise<LogisticsDetailsEntity> {
        const logisticsDetail = await this.logisticsDetailsRepository.findById(logisticsDetailsId);
        if (!logisticsDetail) {
            throw new AppError(`Logistics detail with ID ${logisticsDetailsId} not found.`, 404);
        }
        if (logisticsDetail.logistics_status === LogisticsStatus.COLLECTED) {
            logger.warn(`Logistics detail ${logisticsDetailsId} already collected. Idempotent operation.`);
            return logisticsDetail;
        }
        const updatedLogisticsDetail = await this.logisticsDetailsRepository.update(
            logisticsDetail.logistics_details_id,
            { logistics_status: LogisticsStatus.COLLECTED }
        );
        if (!updatedLogisticsDetail) {
            throw new AppError(`Failed to update logistics status to COLLECTED for ID ${logisticsDetail.logistics_details_id}`, 500);
        }

        const truckInfo = updatedLogisticsDetail.truckAllocations && updatedLogisticsDetail.truckAllocations.length > 0
            ? `by truck ${updatedLogisticsDetail.truckAllocations[0].truck.truck_id} (${updatedLogisticsDetail.truckAllocations[0].truck.truckType.truck_type_name})`
            : 'by an unknown truck';

        if (updatedLogisticsDetail.pickup?.pickup_id && updatedLogisticsDetail.scheduled_time) {
            logger.info(`Pickup number ${updatedLogisticsDetail.pickup.pickup_id} was collected at simulated time ${updatedLogisticsDetail.scheduled_time.toISOString()} ${truckInfo}.`);
        } else {
            logger.info(`Logistics detail ${updatedLogisticsDetail.logistics_details_id} marked as COLLECTED.`);
        }

        if (updatedLogisticsDetail.pickup && updatedLogisticsDetail.pickup.pickup_id) {
            await this.pickupRepository.update(updatedLogisticsDetail.pickup.pickup_id, { pickup_status_id: await this.pickupRepository.getPickupStatusId(PickupStatusEnum.COLLECTED) });
            logger.info(`Related Pickup ${updatedLogisticsDetail.pickup.pickup_id} status updated to COLLECTED.`);
        }
        return updatedLogisticsDetail;
    }

    public async markAsDelivered(logisticsDetailsId: number): Promise<LogisticsDetailsEntity> {
        const logisticsDetail = await this.logisticsDetailsRepository.findById(logisticsDetailsId);
        if (!logisticsDetail) {
            throw new AppError(`Logistics detail with ID ${logisticsDetailsId} not found.`, 404);
        }
        if (logisticsDetail.logistics_status === LogisticsStatus.DELIVERED) {
            logger.warn(`Logistics detail ${logisticsDetailsId} already delivered. Idempotent operation.`);
            return logisticsDetail;
        }
        const updatedLogisticsDetail = await this.logisticsDetailsRepository.update(
            logisticsDetail.logistics_details_id,
            { logistics_status: LogisticsStatus.DELIVERED }
        );
        if (!updatedLogisticsDetail) {
            throw new AppError(`Failed to update logistics status to DELIVERED for ID ${logisticsDetail.logistics_details_id}`, 500);
        }

        const truckInfo = updatedLogisticsDetail.truckAllocations && updatedLogisticsDetail.truckAllocations.length > 0
            ? `by truck ${updatedLogisticsDetail.truckAllocations[0].truck.truck_id} (${updatedLogisticsDetail.truckAllocations[0].truck.truckType.truck_type_name})`
            : 'by an unknown truck'

        if (updatedLogisticsDetail.pickup?.pickup_id && updatedLogisticsDetail.scheduled_time) {
            const inSimDeliveryTime = new Date(Date.UTC(
                updatedLogisticsDetail.scheduled_time.getUTCFullYear(),
                updatedLogisticsDetail.scheduled_time.getUTCMonth(),
                updatedLogisticsDetail.scheduled_time.getUTCDate(),
                23, 59, 59, 999
            ));
            logger.info(`Pickup number ${updatedLogisticsDetail.pickup.pickup_id} was delivered at simulated time ${inSimDeliveryTime.toISOString()} ${truckInfo}.`);
        } else {
            logger.info(`Logistics detail ${updatedLogisticsDetail.logistics_details_id} marked as DELIVERED.`);
        }

        if (updatedLogisticsDetail.pickup && updatedLogisticsDetail.pickup.pickup_id) {
            await this.pickupRepository.update(updatedLogisticsDetail.pickup.pickup_id, { pickup_status_id: await this.pickupRepository.getPickupStatusId(PickupStatusEnum.DELIVERED) });
            logger.info(`Related Pickup ${updatedLogisticsDetail.pickup.pickup_id} status updated to DELIVERED.`);
        }
        return updatedLogisticsDetail;
    }
}