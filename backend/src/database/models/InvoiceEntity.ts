import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('invoice')
export class InvoiceEntity {
  @PrimaryGeneratedColumn({ name: 'invoice_id' })
  invoice_id: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ name: 'paid', type: 'boolean' })
  paid: boolean;
}