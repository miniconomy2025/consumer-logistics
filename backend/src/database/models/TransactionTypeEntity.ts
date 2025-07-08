import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { TransactionEntity } from './TransactionEntity';

@Entity('transaction_type')
export class TransactionTypeEntity {
  @PrimaryGeneratedColumn({ name: 'transaction_type_id' })
  transaction_type_id: number;

  @Column({ name: 'type_name', type: 'varchar', length: 50 })
  type_name: string;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.transaction_type)
  transactions: TransactionEntity[];
}