import { PickupEntity } from '../../database/models/PickupEntity';

export interface IPickupRepository {

  create(pickup: Partial<PickupEntity>): Promise<PickupEntity>;
}