import { DataSource } from 'typeorm';
import { TruckEntity } from './models/TruckEntity';
import { TruckTypeEntity } from './models/TruckTypeEntity';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // IMPORTANT CHANGE HERE:
  synchronize: process.env.NODE_ENV === 'development', // Keep true for dev, false for production
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities: [TruckEntity, TruckTypeEntity],
  // Add your migrations path here:
  migrations: [path.join(__dirname, 'migrations', '*.ts')], // Path to your migration files
  subscribers: [],
});

AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
  })
  .catch((err) => {
    console.error('Error during Data Source initialization:', err);
  });