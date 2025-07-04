import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('pickup_status')
export class PickupStatusEntity {
  @PrimaryGeneratedColumn({ name: 'pickup_status_id' })
  pickup_status_id: number;

  @Column({ name: 'status_name', type: 'varchar', length: 50 })
  status_name: string;
}