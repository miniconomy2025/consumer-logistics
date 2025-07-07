import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PaymentRecord } from '../entities/payment-record';
import { Invoice } from '../entities/invoice';
import { Pickup } from '../entities/pickup';
import { PickupStatus } from '../entities/pickup-status';
import { TransactionLedger } from '../entities/transaction-ledger';
import { TransactionType } from '../entities/transaction-type';
import { PhoneCompany } from '../entities/phone-company';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: false,
  entities: [PaymentRecord, Invoice, Pickup, TransactionLedger, TransactionType, PickupStatus, PhoneCompany],
  migrations: [],
  subscribers: [],
});