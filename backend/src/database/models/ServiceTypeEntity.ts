import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('service_type')
export class ServiceTypeEntity {
  @PrimaryGeneratedColumn({ name: 'pickup_type_id' })
  service_type_id: number;

  @Column({ name: 'service_type_name', type: 'varchar', length: 50, unique: true })
  service_type_name: string;
}
