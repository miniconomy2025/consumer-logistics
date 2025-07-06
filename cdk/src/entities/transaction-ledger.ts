import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Invoice } from './invoice';
import { TransactionType } from './transaction-type';

@Entity()
export class TransactionLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.transactions)
  invoice: Invoice;

  @ManyToOne(() => TransactionType, (type) => type.transactions)
  transactionType: TransactionType;

  @Column('decimal')
  amount: number;

  @Column('date')
  transactionDate: Date;
}