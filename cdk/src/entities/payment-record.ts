import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('payment_record') 
@Unique(['transaction_number'])
export class PaymentRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  transaction_number: string;

  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar' })
  from: string;

  @Column({ type: 'varchar' })
  to: string;

  @Column({ type: 'varchar' })
  reference: string;
}
