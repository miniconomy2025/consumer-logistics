import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PickupEntity } from './PickupEntity';

@Entity('company')
export class CompanyEntity {
  @PrimaryGeneratedColumn({ name: 'company_id' })
  company_id: number;

  @Column({ name: 'company_name', type: 'varchar', length: 255 })
  company_name: string;

  @OneToMany(() => PickupEntity, pickup => pickup.company)
  pickups: PickupEntity[];
}