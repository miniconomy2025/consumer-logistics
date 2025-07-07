import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Pickup } from './pickup';

@Entity()
export class PickupStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  orderStatusName: string;

  @OneToMany(() => Pickup, (pickup) => pickup.pickupStatus)
  pickups: Pickup[];
}