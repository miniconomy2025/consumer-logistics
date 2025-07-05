import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LogisticsDetailsEntity } from './LogisticsDetailsEntity';
import { TruckEntity } from './TruckEntity';

@Entity('truck_allocation')
export class TruckAllocationEntity {
    @PrimaryColumn({ name: 'logistics_details_id', type: 'int' })
    logistics_details_id: number;

    @PrimaryColumn({ name: 'truck_id', type: 'int' })
    truck_id: number;

    @ManyToOne(() => LogisticsDetailsEntity, logisticsDetails => logisticsDetails.truckAllocations)
    @JoinColumn({ name: 'logistics_details_id' })
    logisticsDetails: LogisticsDetailsEntity;

    @ManyToOne(() => TruckEntity, truck => truck.truckAllocations) 
    @JoinColumn({ name: 'truck_id' })
    truck: TruckEntity;
}