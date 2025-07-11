import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Pickup } from './pickup';

@Entity('pickup_status')
export class PickupStatus {
  @PrimaryGeneratedColumn({ name: 'pickup_status_id' })
  id: number;

  @Column({ name: 'status_name', type: 'varchar', length: 50 })
  statusName: string;

  @OneToMany(() => Pickup, (pickup) => pickup.pickupStatus)
  pickups: Pickup[];
}
