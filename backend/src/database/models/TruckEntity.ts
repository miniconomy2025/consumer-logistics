import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TruckTypeEntity } from './TruckTypeEntity';
import { TruckAllocationEntity } from './TruckAllocationEntity';

@Entity('truck')
export class TruckEntity {
    @PrimaryGeneratedColumn({ name: 'truck_id' })
    truck_id: number;

    @Column({ name: 'truck_type_id', type: 'int' })
    truck_type_id: number;

    @Column({ name: 'max_pickups', type: 'int' })
    max_pickups: number;

    @Column({ name: 'max_dropoffs', type: 'int' })
    max_dropoffs: number;

    @Column({ name: 'daily_operating_cost', type: 'decimal', precision: 10, scale: 2 })
    daily_operating_cost: number;

    @Column({ name: 'max_capacity', type: 'decimal', precision: 10, scale: 2 })
    max_capacity: number;

    @Column({ name: 'is_available', type: 'boolean', default: true })
    is_available: boolean;

    @ManyToOne(() => TruckTypeEntity, truckType => truckType.trucks)
    @JoinColumn({ name: 'truck_type_id' })
    truckType: TruckTypeEntity;

    @OneToMany(() => TruckAllocationEntity, truckAllocation => truckAllocation.truck)
    truckAllocations: TruckAllocationEntity[];
}