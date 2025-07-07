import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { InvoiceEntity } from './InvoiceEntity';
import { PickupStatusEntity } from './PickupStatusEntity';
import { CompanyEntity } from './CompanyEntity';
import { LogisticsDetailsEntity } from './LogisticsDetailsEntity';

export enum PickupStatusEnum {
    ORDER_RECEIVED = 'Order Received',
    READY_FOR_COLLECTION = 'Ready for Collection',
    COLLECTED = 'Collected',
    DELIVERED = 'Delivered',
    PAID_TO_LOGISTICS_CO = 'Paid To Logistics Co',
    CANCELLED = 'Cancelled',
    FAILED = 'Failed',
}

@Entity('pickup')
export class PickupEntity {
    @PrimaryGeneratedColumn({ name: 'pickup_id' })
    pickup_id: number;

    @Column({ name: 'invoice_id', type: 'int' })
    invoice_id: number;

    @ManyToOne(() => InvoiceEntity, invoice => invoice.pickups)
    @JoinColumn({ name: 'invoice_id' })
    invoice: InvoiceEntity;

    @Column({ name: 'pickup_status_id', type: 'int' })
    pickup_status_id: number;

    @ManyToOne(() => PickupStatusEntity, pickupStatus => pickupStatus.pickups)
    @JoinColumn({ name: 'pickup_status_id' })
    pickup_status: PickupStatusEntity;

    @Column({ name: 'company_id', type: 'int' })
    company_id: number;

    @ManyToOne(() => CompanyEntity, company => company.pickups)
    @JoinColumn({ name: 'company_id' })
    company: CompanyEntity;

    @Column({ name: 'phone_units', type: 'int' })
    phone_units: number;

    @Column({ name: 'order_date', type: 'date' })
    order_date: Date;

    @Column({ name: 'order_timestamp_simulated', type: 'timestamp' })
    order_timestamp_simulated: Date;

    @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
    unit_price: number;

    @Column({ name: 'pickup_location', type: 'varchar', nullable: true })
    pickup_location: string;

    @Column({ name: 'delivery_location', type: 'varchar', nullable: true })
    delivery_location: string;

    @Column({ name: 'recipient_name', type: 'varchar', length: 255 })
    recipient_name: string;

    @OneToOne(() => LogisticsDetailsEntity, logisticsDetails => logisticsDetails.pickup)
    logisticsDetails: LogisticsDetailsEntity;
}
