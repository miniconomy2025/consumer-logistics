import { DataSource } from 'typeorm';
import { AppDataSource } from '../config/database';

let dataSource: DataSource;

export async function getDataSource(): Promise<DataSource> {
  if (!dataSource?.isInitialized) {
    dataSource = await AppDataSource.initialize();
    console.log('New DB connection established');
  }
  return dataSource;
}

process.on('SIGTERM', async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
    console.log('DB connection closed on SIGTERM');
  }
  process.exit(0);
});