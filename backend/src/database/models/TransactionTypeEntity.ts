import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { TransactionEntity } from './TransactionEntity';

@Entity('transaction_type')
export class TransactionTypeEntity {
  @PrimaryGeneratedColumn({ name: 'transaction_type_id' })
  transaction_type_id: number;

  @Column({ name: 'transaction_type_name', type: 'varchar', length: 50 })
  transaction_type_name: string;

  @ManyToOne(() => TransactionEntity, (transaction) => transaction.transaction_type_id)
  transaction: TransactionEntity;       
}