import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { InvoiceEntity } from './InvoiceEntity';
import { TransactionTypeEntity } from './TransactionTypeEntity';

@Entity('transaction_ledger')
export class TransactionEntity {
  @PrimaryGeneratedColumn({ name: 'transaction_ledger_id' })
  transaction_ledger_id: number;

  @Column({ name: 'invoice_id', type: 'int'})
  invoice_id: number;

  @Column({ name: 'transaction_type_id', type: 'int' })
  transaction_type_id: number;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'transaction_date', type: 'date' })
  transaction_date: Date;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.transactions)
  invoice: InvoiceEntity;

  @ManyToOne(() => TransactionTypeEntity, (transactionType) => transactionType.transactions)
  transaction_type: TransactionTypeEntity;
}