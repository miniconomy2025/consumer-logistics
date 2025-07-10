import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { Pickup } from './pickup';
import { TransactionLedger } from './transaction-ledger';

@Entity('invoice')
export class Invoice {
  @PrimaryGeneratedColumn({ name: 'invoice_id' })
  id: number;

  @Column({
    name: 'reference_number',
    type: 'uuid',
    unique: true,
    default: () => 'uuid_generate_v4()',
  })
  referenceNumber: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'paid', type: 'boolean', default: false })
  paid: boolean;

  @OneToOne(() => Pickup, (pickup) => pickup.invoice)
  @JoinColumn({ name: 'invoice_id' })
  pickup: Pickup;

  @OneToMany(() => TransactionLedger, (tx) => tx.invoice)
  transactions: TransactionLedger[];
}