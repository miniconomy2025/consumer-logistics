import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice';
import { PhoneCompany } from './phone-company';
import { PickupStatus } from './pickup-status';

@Entity('pickup')
export class Pickup {
  @PrimaryGeneratedColumn({ name: 'pickup_id' })
  id: number;

  @OneToOne(() => Invoice, (invoice) => invoice.pickup)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @ManyToOne(() => PhoneCompany, (company) => company.pickups)
  @JoinColumn({ name: 'company_id' })
  phoneCompany: PhoneCompany;

  @ManyToOne(() => PickupStatus, (status) => status.pickups)
  @JoinColumn({ name: 'pickup_status_id' })
  pickupStatus: PickupStatus;

  @Column({ name: 'phone_units', type: 'int' })
  phoneUnits: number;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: Date;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ name: 'order_timestamp_simulated', type: 'timestamp' })
  orderTimestampSimulated: Date;

  @Column({ name: 'model_name', type: 'varchar', length: 255, nullable: true })
  modelName?: string;

  @Column({ name: 'recipient_name', type: 'varchar', length: 255 })
  customer: string;
}
