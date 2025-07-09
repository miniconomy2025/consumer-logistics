import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice';
import { PhoneCompany } from './phone-company';
import { PickupStatus } from './pickup-status';

@Entity()
export class Pickup {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Invoice, (invoice) => invoice.pickup)
  @JoinColumn()
  invoice: Invoice;

  @ManyToOne(() => PhoneCompany, (company) => company.pickups)
  phoneCompany: PhoneCompany;

  @ManyToOne(() => PickupStatus, (status) => status.pickups)
  pickupStatus: PickupStatus;

  @Column('int')
  phoneUnits: number;

  @Column('date')
  orderDate: Date;

  @Column('decimal')
  unitPrice: number;

  @Column({ type: 'nvarchar', length: 255 })
  customer: string;
}