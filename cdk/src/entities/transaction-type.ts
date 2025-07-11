import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { TransactionLedger } from './transaction-ledger';

@Entity('transaction_type')
export class TransactionType {
  @PrimaryGeneratedColumn({ name: 'transaction_type_id' })
  id: number;

  @Column({ name: 'type_name', type: 'varchar', length: 50 })
  typeName: string;

  @OneToMany(() => TransactionLedger, (tx) => tx.transactionType)
  transactions: TransactionLedger[];
}