import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/config';
import { TruckAllocationEntity } from '../../database/models/TruckAllocationEntity';
import { ITruckAllocationRepository } from '../interfaces/ITruckAllocationRepository';
import { AppError } from '../../shared/errors/ApplicationError';
import { logger } from '../../utils/logger';

export class TruckAllocationRepository implements ITruckAllocationRepository {
  private ormRepository: Repository<TruckAllocationEntity>;

  constructor() {
    this.ormRepository = AppDataSource.getRepository(TruckAllocationEntity);
  }

  async create(logisticsDetailsId: number, truckId: number): Promise<TruckAllocationEntity> {
    logger.info(`Allocating Truck ID ${truckId} to Logistics Detail ID ${logisticsDetailsId}.`);
    const newAllocation = this.ormRepository.create({
      logistics_details_id: logisticsDetailsId,
      truck_id: truckId,
    });
    try {
      return await this.ormRepository.save(newAllocation);
    } catch (error: any) {
      if (error.code === '23505' && error.detail.includes('truck_allocation_pkey')) {
        throw new AppError('Truck is already allocated to this logistics detail.', 409);
      }
      logger.error('Error creating truck allocation:', error);
      throw new AppError('Failed to create truck allocation due to a database error.', 500);
    }
  }

  async findByLogisticsDetailId(logisticsDetailsId: number): Promise<TruckAllocationEntity | null> {
    logger.debug(`Fetching truck allocation for Logistics Detail ID: ${logisticsDetailsId}.`);
    return this.ormRepository.findOne({
      where: { logistics_details_id: logisticsDetailsId },
      relations: ['truck']
    });
  }

  async findAllocationsByTruckId(truckId: number): Promise<TruckAllocationEntity[]> {
    logger.debug(`Fetching truck allocations for Truck ID: ${truckId}.`);
    return this.ormRepository.find({
      where: { truck_id: truckId },
      relations: ['logisticsDetails']
    });
  }
}