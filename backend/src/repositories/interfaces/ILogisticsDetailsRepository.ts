import { LogisticsDetailsEntity } from '../../database/models/LogisticsDetailsEntity';
import { FindManyOptions } from 'typeorm'

export interface ILogisticsDetailsRepository {
    findById(id: number): Promise<LogisticsDetailsEntity | null>;
    findReadyForPromotion(untilTimestamp: Date): Promise<LogisticsDetailsEntity[]>;
    findActiveLogisticsForTruckOnDay(truckId: number, inSimDate: Date): Promise<LogisticsDetailsEntity[]>; 
    create(data: Partial<LogisticsDetailsEntity>): Promise<LogisticsDetailsEntity>;
    update(id: number, data: Partial<LogisticsDetailsEntity>): Promise<LogisticsDetailsEntity | null>;
    find(options?: FindManyOptions<LogisticsDetailsEntity>): Promise<LogisticsDetailsEntity[]>;

}