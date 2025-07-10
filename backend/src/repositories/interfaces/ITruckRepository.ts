import { TruckEntity } from '../../database/models/TruckEntity';
import { TruckTypeEntity } from '../../database/models/TruckTypeEntity';

export interface ITruckRepository {

  findById(id: number): Promise<TruckEntity | null>;
  findAll(): Promise<TruckEntity[]>;
  create(truck: Partial<TruckEntity>): Promise<TruckEntity>;
  update(id: number, truck: Partial<TruckEntity>): Promise<TruckEntity | null>;
  delete(id: number): Promise<boolean>;

  findTruckTypeById(id: number): Promise<TruckTypeEntity | null>;
  findTruckTypeByName(name: string): Promise<TruckTypeEntity | null>;
  findAllTruckTypes(): Promise<TruckTypeEntity[]>;
  createTruckType(type: Partial<TruckTypeEntity>): Promise<TruckTypeEntity>;
  updateTruckType(id: number, type: Partial<TruckTypeEntity>): Promise<TruckTypeEntity | null>;
  deleteTruckType(id: number): Promise<boolean>;
  markNTrucksUnavailableByTypeName(truckTypeName: string, count: number): Promise<number>;
  restoreUnavailableTrucksByTypeName(truckTypeName: string): Promise<number>;
}