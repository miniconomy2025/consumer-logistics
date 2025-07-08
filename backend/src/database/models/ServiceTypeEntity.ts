import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { LogisticsDetailsEntity } from './LogisticsDetailsEntity';

export enum ServiceTypeEnum {
    COLLECTION = 1,
    DELIVERY = 2,
}

@Entity('service_type')
export class ServiceTypeEntity {
    @PrimaryGeneratedColumn({ name: 'service_type_id' })
    service_type_id: number;

    @Column({ name: 'service_type_name', type: 'varchar', length: 50, unique: true })
    service_type_name: string;
    @OneToMany(() => LogisticsDetailsEntity, logisticsDetails => logisticsDetails.serviceType)
    logisticsDetails: LogisticsDetailsEntity[];
}
