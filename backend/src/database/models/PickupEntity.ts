import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { InvoiceEntity } from './InvoiceEntity';
import { PickupStatusEntity } from './PickupStatusEntity';
import { CompanyEntity } from './CompanyEntity';

@Entity('pickup') 
export class PickupEntity {
  @PrimaryGeneratedColumn({ name: 'pickup_id' })
  pickup_id: number;

  @Column({ name: 'invoice_id', type: 'int' }) 
  invoice_id: number;

  @ManyToOne(() => InvoiceEntity)
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @Column({ name: 'pickup_status_id', type: 'int' })
  pickup_status_id: number;

  @ManyToOne(() => PickupStatusEntity)
  @JoinColumn({ name: 'pickup_status_id' })
  pickupStatus: PickupStatusEntity;

  @Column({ name: 'company_id', type: 'int' })
  company_id: number;

  @ManyToOne(() => CompanyEntity)
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @Column({ name: 'pickup_date', type: 'date', nullable: true })
  pickup_date: Date | null;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ name: 'customer', type: 'varchar', length: 255 })
  customer: string;
}