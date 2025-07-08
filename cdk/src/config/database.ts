import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PaymentRecord } from '../entities/payment-record';
import { Invoice } from '../entities/invoice';
import { Pickup } from '../entities/pickup';
import { PickupStatus } from '../entities/pickup-status';
import { TransactionLedger } from '../entities/transaction-ledger';
import { TransactionType } from '../entities/transaction-type';
import { PhoneCompany } from '../entities/phone-company';
import { getDbCredentials } from './aws-client';


let AppDataSource: DataSource;

export async function getDataSource(): Promise<DataSource> {
  if (AppDataSource && AppDataSource.isInitialized) {
    return AppDataSource;
  }

  const creds = await getDbCredentials();

  AppDataSource = new DataSource({
    type: 'postgres',
    host: creds.host,
    port: creds.port,
    username: creds.username,
    password: creds.password,
    database: creds.database,
    synchronize: false,
    logging: false,
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

  await AppDataSource.initialize();
  return AppDataSource;
}

process.on('SIGTERM', async () => {
  if (AppDataSource?.isInitialized) {
    await AppDataSource.destroy();
    console.log('DB connection closed on SIGTERM');
  }
  process.exit(0);
});