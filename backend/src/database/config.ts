import { DataSource } from 'typeorm';
import { TruckEntity } from './models/TruckEntity';
import { TruckTypeEntity } from './models/TruckTypeEntity';
import { PickupEntity } from './models/PickupEntity'; 
import { InvoiceEntity } from './models/InvoiceEntity';
import { PickupStatusEntity } from './models/PickupStatusEntity';
import { CompanyEntity } from './models/CompanyEntity';
import { TransactionEntity } from './models/TransactionEntity';
import { ServiceTypeEntity } from './models/ServiceTypeEntity';
import { TransactionTypeEntity } from './models/TransactionType';
import { LogisticsDetailsEntity } from './models/LogisticsDetailsEntity'; 
import { TruckAllocationEntity } from './models/TruckAllocationEntity';
import { TransactionTypeEntity } from './models/TransactionTypeEntity'
import { TransactionEntity } from './models/TransactionEntity';

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    entities: [
        TruckEntity,
        TruckTypeEntity,
        TransactionTypeEntity,
        TransactionEntity,
        PickupEntity,
        InvoiceEntity,
        PickupStatusEntity,
        CompanyEntity, 
        LogisticsDetailsEntity,
        TransactionEntity,
        ServiceTypeEntity,
        TruckAllocationEntity,
    ],
    migrations: [path.join(__dirname, 'migrations', '*.ts')],
    subscribers: [],
});
