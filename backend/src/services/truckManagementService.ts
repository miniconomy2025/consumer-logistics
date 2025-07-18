import { ITruckRepository } from '../repositories/interfaces/ITruckRepository';
import { TruckRepository } from '../repositories/implementations/TruckRepository';
import { TruckEntity } from '../database/models/TruckEntity';
import { TruckTypeEntity } from '../database/models/TruckTypeEntity';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';

export interface CreateTruckData {
  truckTypeId: number;
  maxPickups: number;
  maxDropoffs: number;
  dailyOperatingCost: number;
  maxCapacity: number;
  isAvailable?: boolean;
  quantity?: number;
}

export interface UpdateTruckData extends Partial<CreateTruckData> {}

export interface CreateTruckTypeData {
  truckTypeName: string;
}

export interface UpdateTruckTypeData extends Partial<CreateTruckTypeData> {}

export class TruckManagementService {
  private truckRepository: ITruckRepository;

  constructor(
    truckRepository: ITruckRepository = new TruckRepository()
  ) {
    this.truckRepository = truckRepository;
  }

  public async createTruck(data: CreateTruckData): Promise<TruckEntity[]> {
    logger.info(`Attempting to create ${data.quantity ?? 1} truck(s).`);

    const truckType = await this.truckRepository.findTruckTypeById(data.truckTypeId);
    if (!truckType) {
      throw new AppError(`Truck Type with ID ${data.truckTypeId} not found.`, 404);
    }

    const quantity = data.quantity ?? 1;

    if (quantity <= 0) {
      throw new AppError('Quantity must be a positive number.', 400);
    }

    const createdTrucks: TruckEntity[] = [];

    // Create all trucks
    for (let i = 0; i < quantity; i++) {
      const truck = await this.truckRepository.create({
        truck_type_id: data.truckTypeId,
        max_pickups: data.maxPickups,
        max_dropoffs: data.maxDropoffs,
        daily_operating_cost: data.dailyOperatingCost,
        max_capacity: data.maxCapacity,
        is_available: data.isAvailable ?? true,
      });
      createdTrucks.push(truck);
      logger.info(`Truck created with ID: ${truck.truck_id}`);
    }

    logger.info(`Total of ${quantity} trucks created for truck type ID: ${data.truckTypeId}`);
    return createdTrucks;
  }

  public async getTruckById(id: number): Promise<TruckEntity | null> {
    logger.debug(`Fetching truck by ID: ${id}`);
    return this.truckRepository.findById(id);
  }

  public async getAllTrucks(): Promise<TruckEntity[]> {
    logger.debug('Fetching all trucks.');
    return this.truckRepository.findAll();
  }

  public async updateTruck(id: number, data: UpdateTruckData): Promise<TruckEntity | null> {
    logger.info(`Attempting to update truck with ID: ${id}.`);
    if (data.truckTypeId) {
        const truckType = await this.truckRepository.findTruckTypeById(data.truckTypeId);
        if (!truckType) {
            throw new AppError(`Truck Type with ID ${data.truckTypeId} not found.`, 404);
        }
    }
    const updatedTruck = await this.truckRepository.update(id, {
        truck_type_id: data.truckTypeId,
        max_pickups: data.maxPickups,
        max_dropoffs: data.maxDropoffs,
        daily_operating_cost: data.dailyOperatingCost,
        max_capacity: data.maxCapacity,
        is_available: data.isAvailable
    });
    if (updatedTruck) {
      logger.info(`Truck with ID: ${id} updated.`);
    } else {
      logger.warn(`Truck with ID: ${id} not found for update.`);
    }
    return updatedTruck;
  }

  public async deleteTruck(id: number): Promise<boolean> {
    logger.info(`Attempting to delete truck with ID: ${id}.`);
    const deleted = await this.truckRepository.delete(id);
    if (deleted) {
      logger.info(`Truck with ID: ${id} deleted.`);
    } else {
      logger.warn(`Truck with ID: ${id} not found for deletion.`);
    }
    return deleted;
  }

  public async createTruckType(data: CreateTruckTypeData): Promise<TruckTypeEntity> {
    logger.info('Attempting to create a new truck type.');
    const newTruckType = await this.truckRepository.createTruckType({
      truck_type_name: data.truckTypeName,
    });
    logger.info(`Truck type created with ID: ${newTruckType.truck_type_id}, Name: ${newTruckType.truck_type_name}`);
    return newTruckType;
  }

  public async getTruckTypeById(id: number): Promise<TruckTypeEntity | null> {
    logger.debug(`Fetching truck type by ID: ${id}`);
    return this.truckRepository.findTruckTypeById(id);
  }

  public async getTruckTypeByName(name: string): Promise<TruckTypeEntity | null> {
    logger.debug(`Fetching truck type by name: ${name}`);
    return this.truckRepository.findTruckTypeByName(name);
  }

  public async getAllTruckTypes(): Promise<TruckTypeEntity[]> {
    logger.debug('Fetching all truck types.');
    return this.truckRepository.findAllTruckTypes();
  }

  public async updateTruckType(id: number, data: UpdateTruckTypeData): Promise<TruckTypeEntity | null> {
    logger.info(`Attempting to update truck type with ID: ${id}.`);
    const updatedType = await this.truckRepository.updateTruckType(id, {
        truck_type_name: data.truckTypeName,
    });
    if (updatedType) {
      logger.info(`Truck type with ID: ${id} updated.`);
    } else {
      logger.warn(`Truck type with ID: ${id} not found for update.`);
    }
    return updatedType;
  }

  public async deleteTruckType(id: number): Promise<boolean> {
    logger.info(`Attempting to delete truck type with ID: ${id}.`);
    const deleted = await this.truckRepository.deleteTruckType(id);
    if (deleted) {
      logger.info(`Truck type with ID: ${id} deleted.`);
    } else {
      logger.warn(`Truck type with ID: ${id} not found for deletion.`);
    }
    return deleted;
  }
  public async breakdownTrucksByType(truckTypeName: string, count: number): Promise<number> {
    logger.info(`Breaking down ${count} '${truckTypeName}' truck(s).`);
    return this.truckRepository.markNTrucksUnavailableByTypeName(truckTypeName, count);
  }

  public async restoreTrucksByType(truckTypeName: string): Promise<number> {
    logger.info(`Restoring unavailable '${truckTypeName}' trucks.`);
    return this.truckRepository.restoreUnavailableTrucksByTypeName(truckTypeName);
  }
}