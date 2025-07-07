import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { PickupEntity } from './PickupEntity';

@Entity('logistics_details')
export class LogisticsDetailsEntity {
  @PrimaryGeneratedColumn({ name: 'logistics_details_id' })
  logistics_details_id: number;

  @Column({ name: 'pickup_id', type: 'int' })
  pickup_id: number;

  @Column({ name: 'schedule_date', type: 'date' })
  schedule_date: Date;

  @Column({ name: 'schedule_time', type: 'time' })
  schedule_time: Date;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @ManyToOne(() => PickupEntity, (pickup) => pickup.pickup_id)
  pickup: PickupEntity;
}