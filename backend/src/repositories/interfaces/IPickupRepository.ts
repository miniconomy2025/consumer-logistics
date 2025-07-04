import { PickupEntity } from '../../database/models/PickupEntity';
import { PickupSearchParams } from '../../types/dtos/pickupDtos';

export interface IPickupRepository {
  // Basic CRUD operations
  findById(id: number): Promise<PickupEntity | null>;
  findAll(params?: PickupSearchParams): Promise<{ pickups: PickupEntity[]; totalCount: number }>;
  create(pickup: Partial<PickupEntity>): Promise<PickupEntity>;
  update(id: number, pickup: Partial<PickupEntity>): Promise<PickupEntity | null>;
  delete(id: number): Promise<boolean>;

  // Search and filter operations
  findByCompanyId(companyId: number): Promise<PickupEntity[]>;
  findByStatus(statusId: number): Promise<PickupEntity[]>;
  findByDateRange(dateFrom: string, dateTo: string): Promise<PickupEntity[]>;
  search(params: PickupSearchParams): Promise<{ pickups: PickupEntity[]; totalCount: number }>;

  // Analytics operations
  countByStatus(): Promise<Array<{ statusId: number; statusName: string; count: number }>>;
  getTotalRevenue(dateFrom?: string, dateTo?: string): Promise<number>;
  getRecentPickups(limit: number): Promise<PickupEntity[]>;
  getPendingPickups(): Promise<PickupEntity[]>;

  // Relationship operations
  findWithRelations(id: number): Promise<PickupEntity | null>;
  findAllWithRelations(params?: PickupSearchParams): Promise<{ pickups: PickupEntity[]; totalCount: number }>;
}