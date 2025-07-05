import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PickupEntity } from './PickupEntity';

@Entity('pickup_status')
export class PickupStatusEntity {
    @PrimaryGeneratedColumn({ name: 'pickup_status_id' })
    pickup_status_id: number;

    @Column({ name: 'status_name', type: 'varchar', length: 50, unique: true })
    status_name: string;

    @OneToMany(() => PickupEntity, pickup => pickup.pickup_status)
    pickups: PickupEntity[];
}