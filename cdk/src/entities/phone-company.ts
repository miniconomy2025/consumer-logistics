import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Pickup } from './pickup';

@Entity('company')
export class PhoneCompany {
  @PrimaryGeneratedColumn({ name: 'company_id' })
  id: number;

  @Column({ name: 'company_name', type: 'varchar', length: 255 })
  companyName: string;

  @Column({ name: 'bank_account_id', type: 'varchar', length: 255, nullable: true })
  bankAccountId?: string;

  @OneToMany(() => Pickup, (pickup) => pickup.phoneCompany)
  pickups: Pickup[];
}
