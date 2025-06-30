import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/config';
import { TruckEntity } from '../../database/models/TruckEntity';
import { TruckTypeEntity } from '../../database/models/TruckTypeEntity';
import { ITruckRepository } from '../interfaces/ITruckRepository';
import { AppError } from '../../shared/errors/ApplicationError'
import { logger } from '../../utils/logger';

export class TruckRepository implements ITruckRepository {
  private ormTruckRepository: Repository<TruckEntity>;
  private ormTruckTypeRepository: Repository<TruckTypeEntity>;

  constructor() {
    this.ormTruckRepository = AppDataSource.getRepository(TruckEntity);
    this.ormTruckTypeRepository = AppDataSource.getRepository(TruckTypeEntity);
  }

  // --- Truck Entity Operations ---

  async findById(id: number): Promise<TruckEntity | null> {
    logger.debug(`Fetching truck by ID: ${id}`);
    return this.ormTruckRepository.findOne({ where: { truck_id: id }, relations: ['truckType'] });
  }


  async findAll(): Promise<TruckEntity[]> {
    logger.debug('Fetching all trucks.');
    return this.ormTruckRepository.find({ relations: ['truckType'] });
  }

  async create(truck: Partial<TruckEntity>): Promise<TruckEntity> {
    logger.info('Attempting to create new truck.');
    const newTruck = this.ormTruckRepository.create(truck);
    try {
      return await this.ormTruckRepository.save(newTruck);
    } catch (error: any) {
      logger.error('Error creating truck:', error);
      throw new AppError('Failed to create truck due to a database error.', 500);
    }
  }

  async update(id: number, truck: Partial<TruckEntity>): Promise<TruckEntity | null> {
    logger.info(`Attempting to update truck with ID: ${id}.`);
    const existingTruck = await this.ormTruckRepository.findOneBy({ truck_id: id });
    if (!existingTruck) {
      return null;
    }
    this.ormTruckRepository.merge(existingTruck, truck);
    try {
      return await this.ormTruckRepository.save(existingTruck);
    } catch (error: any) {
      logger.error('Error updating truck:', error);
      throw new AppError('Failed to update truck due to a database error.', 500);
    }
  }

  async delete(id: number): Promise<boolean> {
    logger.info(`Attempting to delete truck with ID: ${id}.`);
    const result = await this.ormTruckRepository.delete(id);
    return result.affected !== 0;
  }

  // --- TruckType Entity Operations (remain unchanged) ---

  async findTruckTypeById(id: number): Promise<TruckTypeEntity | null> {
    logger.debug(`Fetching truck type by ID: ${id}`);
    return this.ormTruckTypeRepository.findOneBy({ truck_type_id: id });
  }

  async findTruckTypeByName(name: string): Promise<TruckTypeEntity | null> {
    logger.debug(`Fetching truck type by name: ${name}`);
    return this.ormTruckTypeRepository.findOneBy({ truck_type_name: name });
  }

  async findAllTruckTypes(): Promise<TruckTypeEntity[]> {
    logger.debug('Fetching all truck types.');
    return this.ormTruckTypeRepository.find();
  }

  async createTruckType(type: Partial<TruckTypeEntity>): Promise<TruckTypeEntity> {
    logger.info('Attempting to create new truck type.');
    const newType = this.ormTruckTypeRepository.create(type);
    try {
      return await this.ormTruckTypeRepository.save(newType);
    } catch (error: any) {
      if (error.code === '23505' && error.detail.includes('truck_type_name')) { 
        throw new AppError('Truck type with this name already exists.', 409);
      }
      logger.error('Error creating truck type:', error);
      throw new AppError('Failed to create truck type due to a database error.', 500);
    }
  }

  async updateTruckType(id: number, type: Partial<TruckTypeEntity>): Promise<TruckTypeEntity | null> {
    logger.info(`Attempting to update truck type with ID: ${id}.`);
    const existingType = await this.ormTruckTypeRepository.findOneBy({ truck_type_id: id });
    if (!existingType) {
      return null;
    }
    this.ormTruckTypeRepository.merge(existingType, type);
    try {
      return await this.ormTruckTypeRepository.save(existingType);
    } catch (error: any) {
      if (error.code === '23505' && error.detail.includes('truck_type_name')) {
        throw new AppError('Another truck type with this name already exists.', 409);
      }
      logger.error('Error updating truck type:', error);
      throw new AppError('Failed to update truck type due to a database error.', 500);
    }
  }

  async deleteTruckType(id: number): Promise<boolean> {
    logger.info(`Attempting to delete truck type with ID: ${id}.`);
    const result = await this.ormTruckTypeRepository.delete(id);
    return result.affected !== 0;
  }
}