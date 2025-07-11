import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PaymentRecord } from '../entities/payment-record';
import { Invoice } from '../entities/invoice';
import { Pickup } from '../entities/pickup';
import { PickupStatus } from '../entities/pickup-status';
import { TransactionLedger } from '../entities/transaction-ledger';
import { TransactionType } from '../entities/transaction-type';
import { PhoneCompany } from '../entities/phone-company';


let AppDataSource: DataSource;

export async function getDataSource(): Promise<DataSource> {
  if (AppDataSource && AppDataSource.isInitialized) {
    return AppDataSource;
  }

  console.log('Initializing database connection...');

  AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    synchronize: false,
    logging: false,
    ssl: { rejectUnauthorized: false },
    entities: [
      PaymentRecord,
      Invoice,
      Pickup,
      TransactionLedger,
      TransactionType,
      PickupStatus,
      PhoneCompany,
    ],
  });

  console.log('Connecting to the database...');

  await AppDataSource.initialize();

  console.log('Database connection established successfully.');
  return AppDataSource;
}

process.on('SIGTERM', async () => {
  if (AppDataSource?.isInitialized) {
    await AppDataSource.destroy();
    console.log('DB connection closed on SIGTERM');
  }
  process.exit(0);
});