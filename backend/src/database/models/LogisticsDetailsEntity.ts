import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ServiceTypeEntity } from './ServiceTypeEntity';

@Entity('logistics_details')
export class LogisticsDetailsEntity {
  @PrimaryGeneratedColumn({ name: 'logistics_details_id' })
  logistics_details_id: number;

  @Column({ name: 'pickup_id', type: 'int' })
  pickup_id: number;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'service_type_id', type: 'int' })
  pickup_type_id: number;

  @Column({ name: 'scheduled_time', type: 'timestamp' })
  scheduled_time: Date;

  @ManyToOne(() => ServiceTypeEntity)
  @JoinColumn({ name: 'service_type_id' })
  serviceType: ServiceTypeEntity;
}
