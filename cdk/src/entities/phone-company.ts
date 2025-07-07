import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Pickup } from './pickup';

@Entity()
export class PhoneCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  companyName: string;

  @OneToMany(() => Pickup, (pickup) => pickup.phoneCompany)
  pickups: Pickup[];
}