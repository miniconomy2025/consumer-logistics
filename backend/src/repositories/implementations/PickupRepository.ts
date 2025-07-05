import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/config';
import { PickupEntity } from '../../database/models/PickupEntity';

import { IPickupRepository } from '../interfaces/IPickupRepository';
import { PickupSearchParams } from '../../types/dtos/pickupDtos';
import { AppError } from '../../shared/errors/ApplicationError';
import { logger } from '../../utils/logger';

export class PickupRepository implements IPickupRepository {
  private ormPickupRepository: Repository<PickupEntity>;

  constructor() {
    this.ormPickupRepository = AppDataSource.getRepository(PickupEntity);
  }

  // --- Basic CRUD Operations ---

  async findById(id: number): Promise<PickupEntity | null> {
    logger.debug(`Fetching pickup by ID: ${id}`);
    return this.ormPickupRepository.findOne({ where: { pickup_id: id } });
  }

  async findAll(params?: PickupSearchParams): Promise<{ pickups: PickupEntity[]; totalCount: number }> {
    logger.debug('Fetching all pickups.');

    let query = this.ormPickupRepository.createQueryBuilder('pickup');

    // Apply filters if provided
    if (params?.companyId) {
      query = query.andWhere('pickup.company_id = :companyId', { companyId: params.companyId });
    }
    if (params?.pickupStatusId) {
      query = query.andWhere('pickup.pickup_status_id = :statusId', { statusId: params.pickupStatusId });
    }
    if (params?.dateFrom) {
      query = query.andWhere('pickup.pickup_date >= :dateFrom', { dateFrom: params.dateFrom });
    }
    if (params?.dateTo) {
      query = query.andWhere('pickup.pickup_date <= :dateTo', { dateTo: params.dateTo });
    }
    if (params?.customer) {
      query = query.andWhere('pickup.customer ILIKE :customer', { customer: `%${params.customer}%` });
    }

    // Get total count
    const totalCount = await query.getCount();

    // Apply pagination
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.offset(params.offset);
    }

    const pickups = await query.getMany();
    return { pickups, totalCount };
  }

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

  async update(id: number, pickup: Partial<PickupEntity>): Promise<PickupEntity | null> {
    logger.info(`Attempting to update pickup with ID: ${id}.`);

    const existingPickup = await this.ormPickupRepository.findOneBy({ pickup_id: id });
    if (!existingPickup) {
      return null;
    }

    this.ormPickupRepository.merge(existingPickup, pickup);
    try {
      return await this.ormPickupRepository.save(existingPickup);
    } catch (error: any) {
      logger.error('Error updating pickup:', error);
      throw new AppError('Failed to update pickup due to a database error.', 500);
    }
  }

  async delete(id: number): Promise<boolean> {
    logger.info(`Attempting to delete pickup with ID: ${id}.`);

    const result = await this.ormPickupRepository.delete(id);
    return result.affected !== 0;
  }

  // --- Search and Filter Operations ---

  async findByCompanyId(companyId: number): Promise<PickupEntity[]> {
    logger.debug(`Fetching pickups for company ID: ${companyId}`);
    return this.ormPickupRepository.find({ where: { company_id: companyId } });
  }

  async findByStatus(statusId: number): Promise<PickupEntity[]> {
    logger.debug(`Fetching pickups for status ID: ${statusId}`);
    return this.ormPickupRepository.find({ where: { pickup_status_id: statusId } });
  }

  async findByDateRange(dateFrom: string, dateTo: string): Promise<PickupEntity[]> {
    logger.debug(`Fetching pickups between ${dateFrom} and ${dateTo}`);
    return this.ormPickupRepository
      .createQueryBuilder('pickup')
      .where('pickup.pickup_date >= :dateFrom', { dateFrom })
      .andWhere('pickup.pickup_date <= :dateTo', { dateTo })
      .getMany();
  }

  async search(params: PickupSearchParams): Promise<{ pickups: PickupEntity[]; totalCount: number }> {
    logger.debug('Searching pickups with parameters:', params);
    return this.findAll(params);
  }

  // --- Analytics Operations ---

  async countByStatus(): Promise<Array<{ statusId: number; statusName: string; count: number }>> {
    logger.debug('Counting pickups by status');

    const result = await this.ormPickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.pickupStatus', 'status')
      .select('pickup.pickup_status_id', 'statusId')
      .addSelect('status.status_name', 'statusName')
      .addSelect('COUNT(pickup.pickup_id)', 'count')
      .groupBy('pickup.pickup_status_id')
      .addGroupBy('status.status_name')
      .getRawMany();

    return result.map(row => ({
      statusId: parseInt(row.statusId),
      statusName: row.statusName,
      count: parseInt(row.count),
    }));
  }

  async getTotalRevenue(dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating total revenue');

    let query = this.ormPickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.invoice', 'invoice')
      .select('SUM(invoice.total_amount)', 'totalRevenue');

    if (dateFrom) {
      query = query.andWhere('pickup.pickup_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query = query.andWhere('pickup.pickup_date <= :dateTo', { dateTo });
    }

    const result = await query.getRawOne();
    return parseFloat(result.totalRevenue) || 0;
  }

  async getRecentPickups(limit: number): Promise<PickupEntity[]> {
    logger.debug(`Fetching ${limit} most recent pickups`);

    return this.ormPickupRepository
      .createQueryBuilder('pickup')
      .orderBy('pickup.pickup_id', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getPendingPickups(): Promise<PickupEntity[]> {
    logger.debug('Fetching pending pickups');

    // Assuming status ID 1 is "Order Received" (pending)
    return this.ormPickupRepository.find({
      where: { pickup_status_id: 1 }
    });
  }

  // --- Relationship Operations ---

  async findWithRelations(id: number): Promise<PickupEntity | null> {
    logger.debug(`Fetching pickup with relations for ID: ${id}`);

    return this.ormPickupRepository
      .createQueryBuilder('pickup')
      .leftJoinAndSelect('pickup.company', 'company')
      .leftJoinAndSelect('pickup.pickupStatus', 'pickupStatus')
      .leftJoinAndSelect('pickup.invoice', 'invoice')
      .where('pickup.pickup_id = :id', { id })
      .getOne();
  }

  async findAllWithRelations(params?: PickupSearchParams): Promise<{ pickups: PickupEntity[]; totalCount: number }> {
    logger.debug('Fetching all pickups with relations');

    let query = this.ormPickupRepository
      .createQueryBuilder('pickup')
      .leftJoinAndSelect('pickup.company', 'company')
      .leftJoinAndSelect('pickup.pickupStatus', 'pickupStatus')
      .leftJoinAndSelect('pickup.invoice', 'invoice');

    // Apply filters if provided
    if (params?.companyId) {
      query = query.andWhere('pickup.company_id = :companyId', { companyId: params.companyId });
    }
    if (params?.pickupStatusId) {
      query = query.andWhere('pickup.pickup_status_id = :statusId', { statusId: params.pickupStatusId });
    }
    if (params?.dateFrom) {
      query = query.andWhere('pickup.pickup_date >= :dateFrom', { dateFrom: params.dateFrom });
    }
    if (params?.dateTo) {
      query = query.andWhere('pickup.pickup_date <= :dateTo', { dateTo: params.dateTo });
    }
    if (params?.customer) {
      query = query.andWhere('pickup.customer ILIKE :customer', { customer: `%${params.customer}%` });
    }

    // Get total count
    const totalCount = await query.getCount();

    // Apply pagination
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.offset(params.offset);
    }

    const pickups = await query.getMany();
    return { pickups, totalCount };
  }
}