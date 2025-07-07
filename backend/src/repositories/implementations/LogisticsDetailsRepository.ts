import { Repository, LessThanOrEqual, Between, In } from 'typeorm';
import { AppDataSource } from '../../database/config';
import { LogisticsDetailsEntity, LogisticsStatus } from '../../database/models/LogisticsDetailsEntity';
import { ILogisticsDetailsRepository } from '../interfaces/ILogisticsDetailsRepository';
import { AppError } from '../../shared/errors/ApplicationError';
import { logger } from '../../utils/logger';

export class LogisticsDetailsRepository implements ILogisticsDetailsRepository {
    private ormRepository: Repository<LogisticsDetailsEntity>;

    constructor() {
        this.ormRepository = AppDataSource.getRepository(LogisticsDetailsEntity);
    }

    async findById(id: number): Promise<LogisticsDetailsEntity | null> {
        logger.debug(`Fetching logistics detail by ID: ${id}`);
        return this.ormRepository.findOne({
            where: { logistics_details_id: id },
            relations: [
                'serviceType',
                'pickup',
                'pickup.company',
                'pickup.pickup_status',
                'pickup.invoice',
                'truckAllocations',
                'truckAllocations.truck',
                'truckAllocations.truck.truckType'
            ],
        });
    }

    async findReadyForPromotion(untilTimestamp: Date): Promise<LogisticsDetailsEntity[]> {
        logger.debug(`Fetching logistics details ready for promotion until: ${untilTimestamp.toISOString()}`);
        return this.ormRepository.find({
            where: {
                logistics_status: LogisticsStatus.READY_FOR_SQS_QUEUEING,
                scheduled_real_pickup_timestamp: LessThanOrEqual(untilTimestamp),
            },
            order: {
                scheduled_real_pickup_timestamp: 'ASC',
            },
            relations: [
                'truckAllocations',
                'truckAllocations.truck',
                'truckAllocations.truck.truckType'
            ]
        });
    }

    async findActiveLogisticsForTruckOnDay(truckId: number, inSimDate: Date): Promise<LogisticsDetailsEntity[]> {
        logger.debug(`Fetching active logistics for truck ${truckId} on simulated date ${inSimDate.toISOString().split('T')[0]}`);

        const startOfDay = new Date(Date.UTC(inSimDate.getUTCFullYear(), inSimDate.getUTCMonth(), inSimDate.getUTCDate(), 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(inSimDate.getUTCFullYear(), inSimDate.getUTCMonth(), inSimDate.getUTCDate(), 23, 59, 59, 999));

        return this.ormRepository.find({
            where: {
                scheduled_time: Between(startOfDay, endOfDay),
                truckAllocations: {
                    truck_id: truckId,
                },
                logistics_status: In([
                    LogisticsStatus.PENDING_PLANNING,
                    LogisticsStatus.READY_FOR_SQS_QUEUEING,
                    LogisticsStatus.QUEUED_FOR_COLLECTION,
                    LogisticsStatus.COLLECTED,
                    LogisticsStatus.QUEUED_FOR_DELIVERY
                ]),
            },
            relations: ['truckAllocations'],
        });
    }


    async create(data: Partial<LogisticsDetailsEntity>): Promise<LogisticsDetailsEntity> {
        logger.info('Attempting to create new logistics detail.');
        const newDetail = this.ormRepository.create(data);
        try {
            return await this.ormRepository.save(newDetail);
        } catch (error: any) {
            logger.error('Error creating logistics detail:', error);
            throw new AppError('Failed to create logistics detail due to a database error.', 500);
        }
    }

    async update(id: number, data: Partial<LogisticsDetailsEntity>): Promise<LogisticsDetailsEntity | null> {
        logger.info(`Attempting to update logistics detail with ID: ${id}.`);
        const existingDetail = await this.ormRepository.findOneBy({ logistics_details_id: id });
        if (!existingDetail) {
            return null;
        }
        this.ormRepository.merge(existingDetail, data);
        try {
            const savedDetail = await this.ormRepository.save(existingDetail);
            const updatedDetailWithRelations = await this.ormRepository.findOne({
                where: { logistics_details_id: savedDetail.logistics_details_id },
                relations: [
                    'serviceType',
                    'pickup',
                    'pickup.company',
                    'pickup.pickup_status',
                    'pickup.invoice',
                    'truckAllocations',
                    'truckAllocations.truck',
                    'truckAllocations.truck.truckType'
                ],
            });
            return updatedDetailWithRelations;
        } catch (error: any) {
            logger.error('Error updating logistics detail:', error);
            throw new AppError('Failed to update logistics detail due to a database error.', 500);
        }
    }
}