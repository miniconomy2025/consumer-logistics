import { TruckAllocationEntity } from '../../database/models/TruckAllocationEntity';

export interface ITruckAllocationRepository {
  create(logisticsDetailsId: number, truckId: number): Promise<TruckAllocationEntity>;
  findByLogisticsDetailId(logisticsDetailsId: number): Promise<TruckAllocationEntity | null>;
  findAllocationsByTruckId(truckId: number): Promise<TruckAllocationEntity[]>;
}