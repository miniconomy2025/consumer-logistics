import { In } from 'typeorm';
import { AppDataSource } from '../database/config';
import { LogisticsDetailsEntity, LogisticsStatus } from '../database/models/LogisticsDetailsEntity';
import { TruckEntity } from '../database/models/TruckEntity';
import { ServiceTypeEnum } from '../database/models/ServiceTypeEntity';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';
import { TimeManager } from './timeManager';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient, SQS_PICKUP_QUEUE_URL, SQS_DELIVERY_QUEUE_URL } from '../config/awsSqs';
import { ILogisticsDetailsRepository } from '../repositories/interfaces/ILogisticsDetailsRepository';
import { IPickupRepository } from '../repositories/interfaces/IPickupRepository';
import { PickupStatusEnum } from '../database/models/PickupEntity';
import { ITruckRepository } from '../repositories/interfaces/ITruckRepository';
import { ITruckAllocationRepository } from '../repositories/interfaces/ITruckAllocationRepository';
import { TruckAllocationEntity } from '../database/models/TruckAllocationEntity';
import { PickupService } from './pickupService';
import { agent } from '../agent';
import fetch from 'node-fetch';

export interface CreateLogisticsDetailsData {
    pickupId: number;
    serviceTypeId: ServiceTypeEnum;
    scheduledSimulationDate: Date;
    quantity: number;
    modelName?: string;
}

export class LogisticsPlanningService {
    public logisticsDetailsRepository: ILogisticsDetailsRepository;
    private truckRepository: ITruckRepository;
    private pickupRepository: IPickupRepository;
    private pickupService: PickupService;
    private truckAllocationRepository: ITruckAllocationRepository;
    private timeManager: TimeManager;
    private sqsClient: SQSClient;

    constructor(
        timeManager: TimeManager,
        logisticsDetailsRepository: ILogisticsDetailsRepository,
        truckRepository: ITruckRepository,
        pickupRepository: IPickupRepository,
        truckAllocationRepository: ITruckAllocationRepository,
        pickupService: PickupService,
        sqsClientInstance: SQSClient = sqsClient
    ) {
        this.timeManager = timeManager;
        this.logisticsDetailsRepository = logisticsDetailsRepository;
        this.truckRepository = truckRepository;
        this.pickupRepository = pickupRepository;
        this.truckAllocationRepository = truckAllocationRepository;
        this.pickupService = pickupService;
        this.sqsClient = sqsClientInstance;
    }

    public async planNewCollection(data: CreateLogisticsDetailsData): Promise<LogisticsDetailsEntity> {
        logger.warn(`planNewCollection called directly for Pickup ID: ${data.pickupId}. This method should primarily be triggered after payment.`);
        throw new AppError("Direct call to deprecated planning method. Use planNewCollectionAfterPayment.", 400);
    }

    public async planNewCollectionAfterPayment(
        pickupId: number,
        quantity: number,
        initialInSimPickupDate: Date
    ): Promise<LogisticsDetailsEntity> {
        logger.info(`Planning logistics for Pickup ID: ${pickupId} after payment. Initial Requested In-Sim Pickup Date: ${initialInSimPickupDate.toISOString()}`);

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

        let scheduledLogistics: LogisticsDetailsEntity;
        try {
            scheduledLogistics = await this.assignPickupToTruckAndSchedule(
                pickupId,
                quantity,
                initialInSimPickupDate,
                undefined, 
                pickup.logisticsDetails?.logistics_details_id 
            );
        } catch (error: any) {
            logger.error(`Initial logistics assignment failed for pickup ${pickupId}: ${error.message}`, error);
            throw error;
        }

        
        logger.info(`Logistics detail ${scheduledLogistics.logistics_details_id} created/updated for Pickup ${pickupId}.`);
        logger.info(`In-sim Collection Scheduled: ${scheduledLogistics.scheduled_time.toISOString()} (Real-world: ${scheduledLogistics.scheduled_real_pickup_timestamp?.toLocaleTimeString()})`);
        logger.info(`In-sim Delivery Scheduled: ${scheduledLogistics.scheduled_real_delivery_timestamp ? scheduledLogistics.scheduled_real_delivery_timestamp.toISOString() : 'N/A'} (Real-world: ${scheduledLogistics.scheduled_real_delivery_timestamp?.toLocaleTimeString()})`);
        logger.info(`Simulated Real-world Pickup Timestamp: ${scheduledLogistics.scheduled_real_simulated_pickup_timestamp?.toISOString()}`);
        logger.info(`Simulated Real-world Delivery Timestamp: ${scheduledLogistics.scheduled_real_simulated_delivery_timestamp?.toISOString()}`);
 
        const now = new Date();
        const realWorldPickupTime = this.timeManager.getRealWorldPickupTimestamp(scheduledLogistics.scheduled_time);
        const realWorldDelaySeconds = Math.max(0, Math.floor((realWorldPickupTime.getTime() - now.getTime()) / 1000));
        await this.sendPickupMessageToSQS(scheduledLogistics.logistics_details_id, realWorldDelaySeconds);
        const updatedLogisticsDetail = await this.logisticsDetailsRepository.update(
            scheduledLogistics.logistics_details_id,
            { logistics_status: LogisticsStatus.QUEUED_FOR_COLLECTION }
        );
        if (!updatedLogisticsDetail) {
            throw new AppError(`Failed to update logistics status for ID ${scheduledLogistics.logistics_details_id} after SQS queueing.`, 500);
        }
        logger.info(`Logistics detail ${updatedLogisticsDetail.logistics_details_id} queued to SQS for collection with ${realWorldDelaySeconds}s delay.`);
 
        await this.pickupService.updatePickupStatus(pickupId, PickupStatusEnum.READY_FOR_COLLECTION);
        logger.info(`Pickup ${pickupId} status updated to READY_FOR_COLLECTION.`);
 
        return updatedLogisticsDetail;
    }
 
    public async assignPickupToTruckAndSchedule(
        pickupId: number,
        quantity: number,
        requestedInSimDate: Date,
        excludeTruckId?: number,
        logisticsDetailIdToUpdate?: number
    ): Promise<LogisticsDetailsEntity> {
        let currentInSimDate = new Date(requestedInSimDate);
        let assignedTruck: TruckEntity | null = null;
        let savedLogisticsDetail: LogisticsDetailsEntity | null = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 365;
 
        let assignedTruckPickupsToday: number = 0;
 
        const allTrucks = await this.truckRepository.findAll();
        const availableTrucks = allTrucks.filter(truck =>
            truck.is_available && (excludeTruckId ? truck.truck_id !== excludeTruckId : true)
        );
 
        if (availableTrucks.length === 0) {
            const statusToSet = LogisticsStatus.NO_TRUCKS_AVAILABLE;
            logger.warn(`No *available* trucks in the fleet to assign for pickup ${pickupId}. All ${allTrucks.length} trucks are either busy or marked unavailable. Status set to ${statusToSet}.`);
 
            if (logisticsDetailIdToUpdate) {
                await this.logisticsDetailsRepository.update(logisticsDetailIdToUpdate, { logistics_status: statusToSet });
            } else {
                await this.logisticsDetailsRepository.create({
                    pickup_id: pickupId,
                    service_type_id: ServiceTypeEnum.COLLECTION,
                    scheduled_time: currentInSimDate,
                    quantity: quantity,
                    logistics_status: statusToSet,
                });
            }
            await this.pickupService.updatePickupStatus(pickupId, PickupStatusEnum.FAILED);
            throw new AppError(`Cannot schedule pickup ${pickupId}: No available trucks to assign.`, 400);
        }
 
        const pickup = await this.pickupRepository.findById(pickupId);
        if (!pickup) {
            throw new AppError(`Pickup with ID ${pickupId} not found during truck assignment.`, 404);
        }

        while (attempts < MAX_ATTEMPTS && !savedLogisticsDetail) {
            logger.debug(`Attempting to schedule pickup ${pickupId} for in-sim date: ${currentInSimDate.toISOString().split('T')[0]}, Attempt: ${attempts + 1}`);

            for (const truck of availableTrucks) {
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
                const scheduledRealPickupTime = this.timeManager.getRealWorldPickupTimestamp(currentInSimDate);
                const scheduledRealDeliveryTime = this.timeManager.getRealWorldDeliveryTimestamp(currentInSimDate);

                const simulatedPickupTimestamp = new Date(Date.UTC(
                    currentInSimDate.getUTCFullYear(),
                    currentInSimDate.getUTCMonth(),
                    currentInSimDate.getUTCDate(),
                    0, 0, 0, 0
                ));
                const simulatedDeliveryTimestamp = new Date(Date.UTC(
                    currentInSimDate.getUTCFullYear(),
                    currentInSimDate.getUTCMonth(),
                    currentInSimDate.getUTCDate(),
                    23, 59, 59, 999
                ));

                const newLogisticsDetailData: Partial<LogisticsDetailsEntity> = {
                    pickup_id: pickupId,
                    service_type_id: ServiceTypeEnum.COLLECTION,
                    scheduled_time: currentInSimDate,
                    quantity: quantity,
                    logistics_status: LogisticsStatus.PENDING_PLANNING,
                    scheduled_real_pickup_timestamp: scheduledRealPickupTime,
                    scheduled_real_delivery_timestamp: scheduledRealDeliveryTime,
                    scheduled_real_simulated_pickup_timestamp: simulatedPickupTimestamp,
                    scheduled_real_simulated_delivery_timestamp: simulatedDeliveryTimestamp,
                };

                if (logisticsDetailIdToUpdate) {
                    savedLogisticsDetail = await this.logisticsDetailsRepository.update(logisticsDetailIdToUpdate, newLogisticsDetailData);
                    const existingAllocation = await this.truckAllocationRepository.findByLogisticsDetailId(logisticsDetailIdToUpdate);
                    if (existingAllocation && existingAllocation.truck_id !== assignedTruck.truck_id) {
                        await AppDataSource.getRepository(TruckAllocationEntity).delete({ logistics_details_id: logisticsDetailIdToUpdate });
                        await this.truckAllocationRepository.create(logisticsDetailIdToUpdate, assignedTruck.truck_id);
                    } else if (!existingAllocation) {
                        await this.truckAllocationRepository.create(logisticsDetailIdToUpdate, assignedTruck.truck_id);
                    }
                } else {
                    savedLogisticsDetail = await this.logisticsDetailsRepository.create(newLogisticsDetailData);
                    await this.truckAllocationRepository.create(savedLogisticsDetail.logistics_details_id, assignedTruck.truck_id);
                }

                if (!savedLogisticsDetail) {
                    throw new AppError('Failed to save or update logistics detail.', 500);
                }

                logger.info(`Pickup ${pickupId} assigned to Truck ID ${assignedTruck.truck_id} for in-sim date ${currentInSimDate.toISOString().split('T')[0]}. Pickup count check: ${assignedTruckPickupsToday + 1}/${assignedTruck.max_pickups}.`);
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
            const statusToSet = LogisticsStatus.PENDING_REPLANNING;
            logger.warn(`Could not assign pickup ${pickupId} to any truck after ${MAX_ATTEMPTS} attempts. Status set to ${statusToSet}.`);

            if (logisticsDetailIdToUpdate) {
                await this.logisticsDetailsRepository.update(logisticsDetailIdToUpdate, { logistics_status: statusToSet });
            } else {
                await this.logisticsDetailsRepository.create({
                    pickup_id: pickupId,
                    service_type_id: ServiceTypeEnum.COLLECTION,
                    scheduled_time: currentInSimDate,
                    quantity: quantity,
                    logistics_status: statusToSet,
                });
            }
            await this.pickupService.updatePickupStatus(pickupId, PickupStatusEnum.FAILED);
            throw new AppError(`Cannot find a slot for pickup ${pickupId} after ${MAX_ATTEMPTS} attempts. Logistics status set to ${statusToSet}.`, 400);
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
        const logisticsDetail = await this.logisticsDetailsRepository.findById(logisticsDetailsId);
        if (!logisticsDetail || !logisticsDetail.pickup) {
            logger.error(`Logistics detail ${logisticsDetailsId} or its pickup not found for SQS delivery message.`);
            throw new AppError(`Logistics detail ${logisticsDetailsId} or its pickup not found.`, 404);
        }

        const messageBody = JSON.stringify({
            eventType: 'DELIVERY_SCHEDULED',
            logisticsDetailsId: logisticsDetailsId,
            modelName: logisticsDetail.pickup.model_name,
            quantity: logisticsDetail.quantity,
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

        const truckAllocation = await this.truckAllocationRepository.findByLogisticsDetailId(logisticsDetailsId);
        if (!truckAllocation || !truckAllocation.truck_id) {
            logger.error(`No truck allocated for logistics detail ${logisticsDetailsId}. Cannot mark as collected.`);
            await this.logisticsDetailsRepository.update(logisticsDetailsId, { logistics_status: LogisticsStatus.FAILED });
            await this.pickupService.updatePickupStatus(logisticsDetail.pickup!.pickup_id, PickupStatusEnum.FAILED);
            throw new AppError(`No truck found for logistics detail ${logisticsDetailsId}.`, 500);
        }

        const allocatedTruck = await this.truckRepository.findById(truckAllocation.truck_id);

        if (!allocatedTruck) {
            logger.error(`Allocated truck ID ${truckAllocation.truck_id} not found. Collection failed for logistics detail ${logisticsDetailsId}.`);
            await this.logisticsDetailsRepository.update(logisticsDetailsId, { logistics_status: LogisticsStatus.FAILED });
            await this.pickupService.updatePickupStatus(logisticsDetail.pickup!.pickup_id, PickupStatusEnum.FAILED);
            throw new AppError(`Allocated truck record not found for collection.`, 500);
        }

        if (!allocatedTruck.is_available) {
            logger.warn(`Truck ${allocatedTruck.truck_id} for logistics detail ${logisticsDetailsId} is not available. Collection failed. Attempting to re-plan.`);
            try {
                await this.logisticsDetailsRepository.update(logisticsDetailsId, { logistics_status: LogisticsStatus.TRUCK_UNAVAILABLE });

                const rePlannedLogistics = await this.reassignTruckForLogistics(logisticsDetailsId, allocatedTruck.truck_id);
                logger.info(`Logistics for Pickup ${logisticsDetail.pickup!.pickup_id} successfully re-planned after original truck (${allocatedTruck.truck_id}) unavailability.`);
                return rePlannedLogistics;
            } catch (replanError: any) {
                logger.error(`Failed to re-plan logistics for ${logisticsDetailsId} after truck unavailability:`, replanError);
                await this.logisticsDetailsRepository.update(logisticsDetailsId, { logistics_status: LogisticsStatus.FAILED });
                await this.pickupService.updatePickupStatus(logisticsDetail.pickup!.pickup_id, PickupStatusEnum.FAILED);
                throw new AppError(`Truck unavailable and re-planning failed for Logistics Detail ${logisticsDetailsId}.`, 500);
            }
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
            await this.pickupService.updatePickupStatus(updatedLogisticsDetail.pickup.pickup_id, PickupStatusEnum.COLLECTED);
            logger.info(`Related Pickup ${updatedLogisticsDetail.pickup.pickup_id} status updated to COLLECTED.`);
        }

        logger.info(`Checking external pickup notification conditions for Logistics ID ${updatedLogisticsDetail.logistics_details_id}: ${updatedLogisticsDetail.pickup?.model_name}`, {
            hasReferenceNumber: !!updatedLogisticsDetail.pickup?.invoice?.reference_number,
            hasQuantity: !!updatedLogisticsDetail.quantity,
            referenceNumber: updatedLogisticsDetail.pickup?.invoice?.reference_number,
            quantity: updatedLogisticsDetail.quantity,
            companyName: updatedLogisticsDetail.pickup?.company?.company_name,
            modelName: updatedLogisticsDetail.pickup?.model_name
        });

        if (
            updatedLogisticsDetail.pickup?.invoice?.reference_number &&
            updatedLogisticsDetail.quantity
        ) {
            try {
                await this.notifyExternalPickup(
                    updatedLogisticsDetail.pickup.invoice.reference_number,
                    updatedLogisticsDetail.quantity,
                    updatedLogisticsDetail.pickup.company?.company_name,
                    updatedLogisticsDetail.pickup.model_name,
                    updatedLogisticsDetail.pickup.recipient_name
                );
                logger.info(`External partner notified for pickup reference ${updatedLogisticsDetail.pickup.invoice.reference_number}.`);
            } catch (err) {
                logger.error(`Failed to notify external partner for pickup for Logistics ID ${updatedLogisticsDetail.logistics_details_id}:`, err);
                // Set logistics status to FAILED and pickup status to FAILED upon notification failure
                await this.logisticsDetailsRepository.update(
                    updatedLogisticsDetail.logistics_details_id,
                    { logistics_status: LogisticsStatus.FAILED }
                );
                if (updatedLogisticsDetail.pickup && updatedLogisticsDetail.pickup.pickup_id) {
                    await this.pickupService.updatePickupStatus(updatedLogisticsDetail.pickup.pickup_id, PickupStatusEnum.FAILED);
                    logger.info(`Related Pickup ${updatedLogisticsDetail.pickup.pickup_id} status updated to FAILED due to external notification failure.`);
                }
                throw new AppError(`External pickup notification failed for Logistics ID ${updatedLogisticsDetail.logistics_details_id}. Status set to FAILED.`, 500);
            }
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

        const truckAllocation = await this.truckAllocationRepository.findByLogisticsDetailId(logisticsDetailsId);
        if (!truckAllocation || !truckAllocation.truck_id) {
            logger.error(`No truck allocated for logistics detail ${logisticsDetailsId}. Cannot mark as delivered.`);
            await this.logisticsDetailsRepository.update(logisticsDetailsId, { logistics_status: LogisticsStatus.FAILED });
            await this.pickupService.updatePickupStatus(logisticsDetail.pickup!.pickup_id, PickupStatusEnum.FAILED);
            throw new AppError(`No truck allocation found for delivery of logistics detail ${logisticsDetailsId}.`, 500);
        }

        const allocatedTruck = await this.truckRepository.findById(truckAllocation.truck_id);

        if (!allocatedTruck) {
            logger.error(`Allocated truck ID ${truckAllocation.truck_id} not found. Delivery failed for logistics detail ${logisticsDetailsId}.`);
            await this.logisticsDetailsRepository.update(logisticsDetailsId, { logistics_status: LogisticsStatus.FAILED });
            await this.pickupService.updatePickupStatus(logisticsDetail.pickup!.pickup_id, PickupStatusEnum.FAILED);
            throw new AppError(`Allocated truck record not found for delivery.`, 500);
        }

        if (!allocatedTruck.is_available) {
            logger.warn(`Truck ${allocatedTruck.truck_id} assigned to logistics detail ${logisticsDetailsId} is unavailable for delivery. Item is STUCK_IN_TRANSIT. Attempting re-delivery planning.`);

            await this.logisticsDetailsRepository.update(logisticsDetailsId, { logistics_status: LogisticsStatus.STUCK_IN_TRANSIT });
            await this.pickupService.updatePickupStatus(logisticsDetail.pickup!.pickup_id, PickupStatusEnum.FAILED); // Update pickup status to reflect problem

            try {
                const rePlannedLogistics = await this.planAlternativeDelivery(logisticsDetailsId, allocatedTruck.truck_id);
                logger.info(`Logistics for Pickup ${logisticsDetail.pickup!.pickup_id} successfully re-planned for alternative delivery.`);
                return rePlannedLogistics;
            } catch (replanError: any) {
                logger.error(`Failed to plan alternative delivery for ${logisticsDetailsId} after truck unavailability:`, replanError);
                await this.logisticsDetailsRepository.update(logisticsDetailsId, { logistics_status: LogisticsStatus.FAILED });
                await this.pickupService.updatePickupStatus(logisticsDetail.pickup!.pickup_id, PickupStatusEnum.FAILED);
                throw new AppError(`Truck unavailable for delivery and alternative planning failed for Logistics Detail ${logisticsDetailsId}.`, 500);
            }
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
            await this.pickupService.updatePickupStatus(updatedLogisticsDetail.pickup.pickup_id, PickupStatusEnum.DELIVERED);
            logger.info(`Related Pickup ${updatedLogisticsDetail.pickup.pickup_id} status updated to DELIVERED.`);
        }
        if (
            updatedLogisticsDetail.pickup?.invoice?.reference_number &&
            updatedLogisticsDetail.quantity
        ) {
            try {
                await this.notifyExternalDelivery(
                    updatedLogisticsDetail.pickup.invoice.reference_number,
                    updatedLogisticsDetail.quantity,
                    updatedLogisticsDetail.pickup.company?.company_name,
                    updatedLogisticsDetail.pickup.model_name,
                    updatedLogisticsDetail.pickup.recipient_name
                );
                logger.info(`External partner notified for delivery reference ${updatedLogisticsDetail.pickup.invoice.reference_number}.`);
            } catch (err) {
                logger.error('Failed to notify external partner for delivery:', err);
            
                await this.logisticsDetailsRepository.update(
                    updatedLogisticsDetail.logistics_details_id,
                    { logistics_status: LogisticsStatus.DELIVERY_NOTIFICATION_FAILED }
                );
                
                if (updatedLogisticsDetail.pickup?.pickup_id) {
                    await this.pickupService.updatePickupStatus(
                        updatedLogisticsDetail.pickup.pickup_id,
                        PickupStatusEnum.COLLECTED 
                    );
                }
                logger.warn(`Logistics ID ${updatedLogisticsDetail.logistics_details_id} marked as DELIVERY_NOTIFICATION_FAILED due to webhook error.`);            }
            
        }
        return updatedLogisticsDetail;
    }


    public async reassignTruckForLogistics(logisticsDetailsId: number, excludeTruckId?: number): Promise<LogisticsDetailsEntity> {
        logger.info(`Attempting to reassign truck for Logistics Detail ID: ${logisticsDetailsId}`);

        const logisticsDetail = await this.logisticsDetailsRepository.findById(logisticsDetailsId);
        if (!logisticsDetail || !logisticsDetail.pickup) {
            throw new AppError(`Logistics detail ${logisticsDetailsId} or its pickup not found for reassignment.`, 404);
        }

        const currentAllocation = await this.truckAllocationRepository.findByLogisticsDetailId(logisticsDetailsId);
        if (currentAllocation) {
            await AppDataSource.getRepository(TruckAllocationEntity).delete({ logistics_details_id: logisticsDetailsId, truck_id: currentAllocation.truck_id });
            logger.info(`Cleared old truck allocation for Logistics Detail ID ${logisticsDetailsId}.`);
        }

        const rePlannedLogistics = await this.assignPickupToTruckAndSchedule(
            logisticsDetail.pickup.pickup_id,
            logisticsDetail.quantity,
            this.timeManager.getCurrentTime(),
            excludeTruckId,
            logisticsDetailsId
        );

        const realWorldPickupTime = this.timeManager.getRealWorldPickupTimestamp(rePlannedLogistics.scheduled_time);
        const now = new Date();
        const realWorldDelaySeconds = Math.max(0, Math.floor((realWorldPickupTime.getTime() - now.getTime()) / 1000));
        await this.sendPickupMessageToSQS(rePlannedLogistics.logistics_details_id, realWorldDelaySeconds);

        await this.pickupService.updatePickupStatus(rePlannedLogistics.pickup!.pickup_id, PickupStatusEnum.READY_FOR_COLLECTION);

        logger.info(`Successfully re-assigned truck for Logistics Detail ID ${logisticsDetailsId}. New assignment: Truck ${rePlannedLogistics.truckAllocations?.[0]?.truck_id} for sim-date ${rePlannedLogistics.scheduled_time.toISOString().split('T')[0]}.`);

        return rePlannedLogistics;
    }

    public async planAlternativeDelivery(originalLogisticsId: number, brokenTruckId?: number): Promise<LogisticsDetailsEntity> {
        logger.info(`Planning alternative delivery for original Logistics Detail ID: ${originalLogisticsId}. Broken Truck ID: ${brokenTruckId || 'N/A'}`);

        const originalLogistics = await this.logisticsDetailsRepository.findById(originalLogisticsId);
        if (!originalLogistics || !originalLogistics.pickup) {
            throw new AppError(`Original logistics detail ${originalLogisticsId} or its pickup not found for alternative delivery planning.`, 404);
        }

        const currentAllocation = await this.truckAllocationRepository.findByLogisticsDetailId(originalLogisticsId);
        if (currentAllocation) {
            await AppDataSource.getRepository(TruckAllocationEntity).delete({ logistics_details_id: originalLogisticsId });
            logger.info(`Cleared old truck allocation for Logistics Detail ID ${originalLogisticsId} for alternative delivery planning.`);
        }

        let currentInSimDate = this.timeManager.getCurrentTime();
        let assignedTruck: TruckEntity | null = null;
        let savedAlternativeDeliveryLogistics: LogisticsDetailsEntity | null = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 365;

        const allTrucks = await this.truckRepository.findAll();
        const availableTrucks = allTrucks.filter(truck =>
            truck.is_available && (brokenTruckId ? truck.truck_id !== brokenTruckId : true)
        );

        if (availableTrucks.length === 0) {
            logger.warn(`No available trucks to plan alternative delivery for Logistics Detail ${originalLogisticsId}.`);
            await this.logisticsDetailsRepository.update(originalLogisticsId, { logistics_status: LogisticsStatus.NO_TRUCKS_AVAILABLE });
            throw new AppError(`No available trucks found for alternative delivery.`, 500);
        }

        while (attempts < MAX_ATTEMPTS && !savedAlternativeDeliveryLogistics) {
            for (const truck of availableTrucks) {
                const activeLogisticsForTruckToday = await this.logisticsDetailsRepository.findActiveLogisticsForTruckOnDay(truck.truck_id, currentInSimDate);
                const currentDropoffs = activeLogisticsForTruckToday.filter(ld => ld.service_type_id === ServiceTypeEnum.DELIVERY).length;

                if (currentDropoffs >= truck.max_dropoffs) {
                    logger.debug(`Truck ${truck.truck_id} (max_dropoffs: ${truck.max_dropoffs}) already has ${currentDropoffs} dropoffs scheduled for ${currentInSimDate.toISOString().split('T')[0]}. Skipping for this truck.`);
                    continue;
                }

                assignedTruck = truck;
                break;
            }

            if (assignedTruck) {
                const scheduledRealDeliveryTime = this.timeManager.getRealWorldDeliveryTimestamp(currentInSimDate);
                const simulatedDeliveryTimestamp = new Date(Date.UTC(
                    currentInSimDate.getUTCFullYear(), currentInSimDate.getUTCMonth(), currentInSimDate.getUTCDate(),
                    23, 59, 59, 999
                ));

                const updateData: Partial<LogisticsDetailsEntity> = {
                    logistics_status: LogisticsStatus.QUEUED_FOR_DELIVERY,
                    scheduled_time: currentInSimDate,
                    scheduled_real_delivery_timestamp: scheduledRealDeliveryTime,
                    scheduled_real_simulated_delivery_timestamp: simulatedDeliveryTimestamp,
                };
                savedAlternativeDeliveryLogistics = await this.logisticsDetailsRepository.update(originalLogisticsId, updateData);

                await this.truckAllocationRepository.create(originalLogisticsId, assignedTruck.truck_id);


                logger.info(`Alternative delivery for Logistics Detail ${originalLogisticsId} assigned to Truck ID ${assignedTruck.truck_id} for sim-date ${currentInSimDate.toISOString().split('T')[0]}.`);

            } else {
                currentInSimDate = new Date(currentInSimDate);
                currentInSimDate.setUTCDate(currentInSimDate.getUTCDate() + 1);
                currentInSimDate.setUTCHours(0, 0, 0, 0);
                attempts++;
                logger.debug(`No available truck for alternative delivery on ${currentInSimDate.toISOString().split('T')[0]}. Trying next day.`);
            }
        }

        if (!savedAlternativeDeliveryLogistics) {
            await this.logisticsDetailsRepository.update(originalLogisticsId, { logistics_status: LogisticsStatus.NO_TRUCKS_AVAILABLE });
            throw new AppError(`Could not find a truck for alternative delivery of Logistics Detail ${originalLogisticsId} after ${MAX_ATTEMPTS} attempts.`, 500);
        }

        const now = new Date();
        const realWorldDeliveryDelaySeconds = Math.max(0, Math.floor((savedAlternativeDeliveryLogistics.scheduled_real_delivery_timestamp!.getTime() - now.getTime()) / 1000));
        await this.sendDeliveryMessageToSQS(savedAlternativeDeliveryLogistics.logistics_details_id, realWorldDeliveryDelaySeconds);
        logger.info(`Re-planned delivery for Logistics ID ${savedAlternativeDeliveryLogistics.logistics_details_id} re-queued to DELIVERY SQS with ${realWorldDeliveryDelaySeconds}s delay.`);

        return savedAlternativeDeliveryLogistics;
    }

    public async replanPendingOrFailed(): Promise<void> {
        const statusesToReplan = [
            LogisticsStatus.NO_TRUCKS_AVAILABLE,
            LogisticsStatus.PENDING_REPLANNING,
            LogisticsStatus.TRUCK_UNAVAILABLE,
            LogisticsStatus.STUCK_IN_TRANSIT,
            LogisticsStatus.ALTERNATIVE_DELIVERY_PLANNED,
            LogisticsStatus.FAILED,
            LogisticsStatus.DELIVERY_NOTIFICATION_FAILED // ✅ New
        ];
    
        logger.info(`[LogisticsPlanningService] Starting re-planning for logistics with statuses: ${statusesToReplan.join(', ')}`);
    
        const failedLogistics = await this.logisticsDetailsRepository.find({
            where: { logistics_status: In(statusesToReplan) },
            relations: ['pickup', 'pickup.company', 'pickup.invoice'],
        });
    
        if (failedLogistics.length === 0) {
            logger.info('[LogisticsPlanningService] No logistics details found requiring re-planning.');
            return;
        }
    
        logger.info(`[LogisticsPlanningService] Found ${failedLogistics.length} logistics details to re-plan.`);
    
        for (const detail of failedLogistics) {
            if (!detail.pickup) {
                logger.warn(`Skipping replanning for logistics detail ${detail.logistics_details_id}: No associated pickup found.`);
                continue;
            }
    
            try {
                logger.info(`Retrying logistics for Pickup ID: ${detail.pickup.pickup_id} (Logistics ID: ${detail.logistics_details_id}). Current Status: ${detail.logistics_status}`);
    
                // ✅ Retry delivery notification only (don't replan pickup or delivery)
                if (detail.logistics_status === LogisticsStatus.DELIVERY_NOTIFICATION_FAILED) {
                    try {
                        await this.notifyExternalDelivery(
                            detail.pickup.invoice!.reference_number,
                            detail.quantity,
                            detail.pickup.company?.company_name,
                            detail.pickup.model_name,
                            detail.pickup.recipient_name
                        );
                        await this.logisticsDetailsRepository.update(detail.logistics_details_id, {
                            logistics_status: LogisticsStatus.DELIVERED
                        });
                        logger.info(`Notification retry succeeded. Status reset to DELIVERED for Logistics ID ${detail.logistics_details_id}.`);
                    } catch (notifyErr) {
                        logger.warn(`Retry delivery notification failed again for Logistics ID ${detail.logistics_details_id}: ${notifyErr}`);
                    }
                    continue; 
                }
    
                if (detail.logistics_status !== LogisticsStatus.STUCK_IN_TRANSIT &&
                    detail.logistics_status !== LogisticsStatus.ALTERNATIVE_DELIVERY_PLANNED) {
                    await this.logisticsDetailsRepository.update(detail.logistics_details_id, {
                        logistics_status: LogisticsStatus.PENDING_REPLANNING
                    });
                    await this.pickupService.updatePickupStatus(detail.pickup.pickup_id, PickupStatusEnum.ORDER_RECEIVED);
                }
    
                if (detail.logistics_status === LogisticsStatus.STUCK_IN_TRANSIT ||
                    detail.logistics_status === LogisticsStatus.ALTERNATIVE_DELIVERY_PLANNED) {
                    logger.info(`Attempting alternative delivery for logistics ${detail.logistics_details_id}.`);
                    await this.planAlternativeDelivery(detail.logistics_details_id);
                } else {
                    logger.info(`Attempting to reassign truck for logistics ${detail.logistics_details_id}.`);
                    await this.reassignTruckForLogistics(detail.logistics_details_id);
                }
    
                logger.info(`Successfully re-planned logistics detail ${detail.logistics_details_id}.`);
            } catch (err: any) {
                logger.warn(`Retry for logistics detail ${detail.logistics_details_id} (Pickup ID: ${detail.pickup.pickup_id}) failed again: ${err.message}`);
            }
        }
    
        logger.info(`Retry process completed. Re-attempted ${failedLogistics.length} failed logistics.`);
    }    
    public async notifyExternalDelivery(delivery_reference: string, quantity: number, companyName?: string, model_name?: string, recipient_name?: string): Promise<void> {
        const COMPANY_DELIVERY_URLS: Record<string, string> = {
            'pear': 'https://pear-company-api.projects.bbdgrad.com/public-api/logistics/notification',
            'recycler': 'https://recycler-api.projects.bbdgrad.com/logistics/consumer-deliveries',
            'sumsang-company': 'https://sumsang-phones-api.projects.bbdgrad.com/public-api/logistics/notification'
        };

        logger.debug("Delivery : ", JSON.stringify({
            delivery_reference,
            quantity,
            status: 'delivered',
            companyName: companyName || 'Unknown',
            modelName: model_name || 'Unknown'
        }))
        // Determine webhook URL based on company name
        let webhookUrl = 'https://webhook.site/948ae0f0-871f-427d-a745-c13e0345dff7'; // Default fallback
        if (companyName && COMPANY_DELIVERY_URLS[companyName]) {
            webhookUrl = COMPANY_DELIVERY_URLS[companyName];
            logger.debug(`Using company-specific delivery webhook URL for ${companyName}: ${webhookUrl}`);
        } else {
            logger.debug(`Using default delivery webhook URL for company: ${companyName || 'Unknown'}`);
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            agent: agent,
            body: JSON.stringify({
                delivery_reference,
                status: 'delivered',
                quantity,
                companyName: companyName || 'Unknown',
                modelName: model_name || 'Unknown',
                recipient: recipient_name || 'Not Specified'
            })
        });
        console.log('response from webhook delivery :', JSON.stringify(response))


        if (!response.ok) {

            throw new Error(`Failed to notify external delivery API for ${companyName || 'Unknown'}: ${response.statusText} (URL: ${webhookUrl}) `);
        }

        logger.info(`Delivery notification sent successfully to ${companyName || 'Unknown'} via ${webhookUrl}`);
    }

    public async notifyExternalPickup(delivery_reference: string, quantity: number, companyName?: string, model_name?: string, recipient_name?: string): Promise<void> {
        const COMPANY_COLLECTION_URLS: Record<string, string> = {
            'pear': 'https://pear-company-api.projects.bbdgrad.com/public-api/logistics',
            'recycler': 'https://thoh-api.projects.bbdgrad.com/recycled-phones-collect',
            'sumsang-company': 'https://sumsang-phones-api.projects.bbdgrad.com/public-api/logistics'
        };
        let webhookUrl = 'https://webhook.site/948ae0f0-871f-427d-a745-c13e0345dff7';
        if (companyName && COMPANY_COLLECTION_URLS[companyName]) {
            webhookUrl = COMPANY_COLLECTION_URLS[companyName];
            logger.debug(`Using company-specific collection webhook URL for ${companyName}: ${webhookUrl}`);
        } else {
            logger.debug(`Using default collection webhook URL for company: ${companyName || 'Unknown'}`);
        }
        logger.info("notifyExternalPickup : ", JSON.stringify({
            id: delivery_reference,
            type: 'PICKUP',
            quantity,
            companyName: companyName || 'Unknown',
            modelName: model_name || 'Unknown'
        }));
        const response = await fetch(webhookUrl, {

            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            agent: agent,
            body: JSON.stringify({
                id: delivery_reference,
                type: 'PICKUP',
                quantity,
                companyName: companyName || 'Unknown',
                modelName: model_name || 'Unknown',
                recipient: recipient_name || 'Not Specified'
            })
        });

        console.log('response from webhook pickup:', JSON.stringify(response))
        if (!response.ok) {
            throw new Error(`Failed to notify external pickup API for ${companyName || 'Unknown'} : ${response.statusText} : ${webhookUrl}`);
        }

        logger.info(`Collection notification sent successfully to ${companyName || 'Unknown'} via ${webhookUrl}`);
    }
}
