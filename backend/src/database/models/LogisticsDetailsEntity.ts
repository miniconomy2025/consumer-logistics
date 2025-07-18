import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { ServiceTypeEntity } from './ServiceTypeEntity';
import { PickupEntity } from './PickupEntity';
import { TruckAllocationEntity } from './TruckAllocationEntity';

export enum LogisticsStatus {
    PENDING_PLANNING = 'PENDING_PLANNING',
    READY_FOR_SQS_QUEUEING = 'READY_FOR_SQS_QUEUEING',
    QUEUED_FOR_COLLECTION = 'QUEUED_FOR_COLLECTION',
    COLLECTED = 'COLLECTED',
    QUEUED_FOR_DELIVERY = 'QUEUED_FOR_DELIVERY',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
    FAILED = 'FAILED',
    PENDING_REPLANNING = 'PENDING_REPLANNING', 
    TRUCK_UNAVAILABLE = 'TRUCK_UNAVAILABLE', 
    NO_TRUCKS_AVAILABLE = 'NO_TRUCKS_AVAILABLE', 
    STUCK_IN_TRANSIT = 'STUCK_IN_TRANSIT', 
    ALTERNATIVE_DELIVERY_PLANNED = 'ALTERNATIVE_DELIVERY_PLANNED', 
    DELIVERY_NOTIFICATION_FAILED = 'DELIVERY_NOTIFICATION_FAILED'
}

@Entity('logistics_details')
export class LogisticsDetailsEntity {
    @PrimaryGeneratedColumn({ name: 'logistics_details_id' })
    logistics_details_id: number;

    @Column({ name: 'pickup_id', type: 'int' })
    pickup_id: number;

    @Column({ name: 'service_type_id', type: 'int' })
    service_type_id: number;

    @Column({ name: 'scheduled_time', type: 'timestamp' })
    scheduled_time: Date;

    @Column({ name: 'quantity', type: 'int' })
    quantity: number;

    @Column({ name: 'logistics_status', type: 'varchar', length: 50, default: LogisticsStatus.PENDING_PLANNING })
    logistics_status: LogisticsStatus;

    @Column({ name: 'scheduled_real_pickup_timestamp', type: 'timestamp', nullable: true })
    scheduled_real_pickup_timestamp: Date | null;

    @Column({ name: 'scheduled_real_delivery_timestamp', type: 'timestamp', nullable: true })
    scheduled_real_delivery_timestamp: Date | null;

    @Column({ name: 'scheduled_simulated_pickup_timestamp', type: 'timestamp', nullable: true })
    scheduled_real_simulated_pickup_timestamp: Date | null;

    @Column({ name: 'scheduled_simulated_delivery_timestamp', type: 'timestamp', nullable: true })
    scheduled_real_simulated_delivery_timestamp: Date | null;

    @ManyToOne(() => ServiceTypeEntity, serviceType => serviceType.logisticsDetails)
    @JoinColumn({ name: 'service_type_id' })
    serviceType: ServiceTypeEntity;

    @OneToOne(() => PickupEntity, pickup => pickup.logisticsDetails)
    @JoinColumn({ name: 'pickup_id' })
    pickup: PickupEntity;

    @OneToMany(() => TruckAllocationEntity, truckAllocation => truckAllocation.logisticsDetails)
    truckAllocations: TruckAllocationEntity[];
}