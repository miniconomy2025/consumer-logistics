import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('pickup_status')
export class PickupStatusEntity {
  @PrimaryGeneratedColumn({ name: 'pickup_status_id' })
  pickup_status_id: number;

  @Column({ name: 'pickup_status_name', type: 'varchar', length: 50, unique: true })
  pick_status_name: string;
}
