import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice';
import { TransactionType } from './transaction-type';

@Entity('transaction_ledger')
export class TransactionLedger {
  @PrimaryGeneratedColumn({ name: 'transaction_ledger_id' })
  id: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.transactions)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @ManyToOne(() => TransactionType, (type) => type.transactions)
  @JoinColumn({ name: 'transaction_type_id' })
  transactionType: TransactionType;

  @Column({ name: 'amount', type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate: Date;
}