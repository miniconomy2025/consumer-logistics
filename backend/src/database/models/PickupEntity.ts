import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PickupStatusEntity } from './PickupStatusEntity';

@Entity('pickup')
export class PickupEntity {
  @PrimaryGeneratedColumn({ name: 'pickup_id' })
  pickup_id: number;

  @Column({ name: 'invoice_id', type: 'int', nullable: true })
  invoice_id: number | null;

  @Column({ name: 'phone_company_id', type: 'int' })
  phone_company_id: number;

  @Column({ name: 'pickup_status_id', type: 'int' })
  pickup_status_id: number;

  @Column({ name: 'phone_units', type: 'int' })
  phone_units: number;

  @Column({ name: 'pickup_date', type: 'date' })
  pickup_date: Date;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @ManyToOne(() => PickupStatusEntity)
  @JoinColumn({ name: 'pickup_status_id' })
  pickupStatus: PickupStatusEntity;
}
