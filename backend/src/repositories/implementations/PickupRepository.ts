import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/config';
import { PickupEntity } from '../../database/models/PickupEntity';
import { IPickupRepository } from '../interfaces/IPickupRepository';
import { AppError } from '../../shared/errors/ApplicationError'
import { logger } from '../../utils/logger';

export class PickupRepository implements IPickupRepository {
  private ormPickupRepository: Repository<PickupEntity>;

  constructor() {
    this.ormPickupRepository = AppDataSource.getRepository(PickupEntity);
  }

  // --- Pickup Entity Operations ---

  async create(pickup: Partial<PickupEntity>): Promise<PickupEntity> {
    logger.info('Attempting to create new pickup request.');
    const newPickup = this.ormPickupRepository.create(pickup);
    try {
      return await this.ormPickupRepository.save(newPickup);
    } catch (error: any) {
      logger.error('Error creating pickup request:', error);
      throw new AppError('Failed to create pickup request due to a database error.', 500);
    }
  }
}