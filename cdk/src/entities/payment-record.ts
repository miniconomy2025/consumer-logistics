import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('Payment_Record')
@Unique(['transaction_number'])
export class PaymentRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  transaction_number: string;

  @Column()
  status: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column()
  description: string;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column()
  reference: string;
}
