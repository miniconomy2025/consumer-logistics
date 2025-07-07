import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { TransactionLedger } from './transaction-ledger';

@Entity()
export class TransactionType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  typeName: string;

  @OneToMany(() => TransactionLedger, (tx) => tx.transactionType)
  transactions: TransactionLedger[];
}