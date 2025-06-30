import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { TruckEntity } from './TruckEntity';

@Entity('truck_type') 
export class TruckTypeEntity {
  @PrimaryGeneratedColumn({ name: 'truck_type_id' })
  truck_type_id: number;

  @Column({ name: 'truck_type_name', type: 'varchar', length: 50, unique: true })
  truck_type_name: string; 
  
  @OneToMany(() => TruckEntity, truck => truck.truckType)
  trucks: TruckEntity[];
}