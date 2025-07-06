import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { InvoiceEntity } from './InvoiceEntity';
import { ServiceTypeEntity } from './ServiceTypeEntity';

@Entity('transaction')
export class TransactionEntity {
  @PrimaryGeneratedColumn({ name: 'transaction_id' })
  transaction_id: number;

  @Column({ name: 'invoice_id', type: 'int'})
  invoice_id: number;

  @Column({ name: 'service_type_id', type: 'int' })
  service_type_id: number;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'transaction_date', type: 'date' })
  transaction_date: Date;

  @Column({ name: 'transaction_type_id', type: 'int' })
  transaction_type_id: number;

  @OneToOne(() => InvoiceEntity, (invoice) => invoice.invoice_id)
  invoice: InvoiceEntity;

  @OneToOne(() => ServiceTypeEntity, (service_type) => service_type.service_type_id)
  service_type: ServiceTypeEntity;

}