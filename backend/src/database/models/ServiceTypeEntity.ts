import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { TransactionEntity } from './TransactionEntity';

@Entity('service_type')
export class ServiceTypeEntity {
  @PrimaryGeneratedColumn({ name: 'service_type_id' })
  service_type_id: number;

  @Column({ name: 'service_type_name', type: 'varchar', length: 50 })
  service_type_name: string;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.service_type_id)
  transaction: TransactionEntity;
}
