import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PickupEntity } from './PickupEntity';

@Entity('company')
export class CompanyEntity {
    @PrimaryGeneratedColumn({ name: 'company_id' })
    company_id: number;
  
    @Column({ name: 'company_name', type: 'varchar', length: 255, unique: true }) 
    company_name: string;

    @Column({ name: 'bank_account_id', type: 'varchar', length: 255, nullable: true }) 
    bank_account_id: string | null;

    @OneToMany(() => PickupEntity, pickup => pickup.company) 
    pickups: PickupEntity[];
}