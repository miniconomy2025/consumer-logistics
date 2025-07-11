import { AppDataSource } from '../database/config';
import { logger } from '../utils/logger';
import { PickupStatusEntity } from '../database/models/PickupStatusEntity';
import { ServiceTypeEntity } from '../database/models/ServiceTypeEntity';
import { TruckTypeEntity } from '../database/models/TruckTypeEntity';
import { TimeManager } from './timeManager';
import { TruckPurchaseService } from './truckPurchaseService';


export class SimulationResetService {

  static async resetAndMigrateDatabase(): Promise<void> {
    const connection = AppDataSource;

    if (!connection.isInitialized) {
      logger.info('[SimulationResetService] Initializing database connection...');
      await connection.initialize();
      logger.info('[SimulationResetService] Database connection initialized.');
    } else {
      logger.info('[SimulationResetService] Database connection already initialized.');
    }

    logger.warn('[SimulationResetService] Dropping all database tables...');
    try {
      await connection.dropDatabase();
      logger.info('All database tables dropped successfully.');
    } catch (error) {
      logger.error('Failed to drop database tables:', error);
      throw error;
    }


    logger.info('[SimulationResetService] Running database migrations...');
    try {
      await connection.runMigrations();
      logger.info('Database migrations ran successfully.');
    } catch (error) {
      logger.error('Failed to run database migrations:', error);
      throw error; 
    }


    logger.info('[SimulationResetService] Seeding required data...');
    try {
      await this.seedRequiredData();
      logger.info('Required data seeded successfully.');
    } catch (error) {
      logger.error('Failed to seed required data:', error);
      throw error; 
    }

  TimeManager.getInstance().reset();
    logger.info('TimeManager clock reset for simulation environment.');
    logger.info('Database reset, migrated, and seeded successfully for simulation.');
  }

  private static async seedRequiredData(): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const pickupStatusesData = [
        { status_name: 'Order Received' },
        { status_name: 'Paid To Logistics Co' },
        { status_name: 'Ready for Collection' },
        { status_name: 'Collected' },
        { status_name: 'Delivered' },
        { status_name: 'Cancelled' },
        { status_name: 'Failed' },
      ];
      await queryRunner.manager.getRepository(PickupStatusEntity).insert(pickupStatusesData);
      logger.info('Seeded pickup statuses.');

      const serviceTypesData = [
        { service_type_id: 1, service_type_name: 'COLLECTION' },
        { service_type_id: 2, service_type_name: 'DELIVERY' },
      ];
      await queryRunner.manager.getRepository(ServiceTypeEntity).insert(serviceTypesData);
      logger.info('Seeded service types.');

      const defaultTruckType = { truck_type_name: 'Small Truck' };
      await queryRunner.manager.getRepository(TruckTypeEntity).insert(defaultTruckType);
      logger.info('Seeded default truck type.');

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error seeding data, rolling back transaction:', error);
      throw error;
    } finally {
      await queryRunner.release();
      const truckPurchaseService = new TruckPurchaseService();
      await truckPurchaseService.purchaseTrucksFullFlow(14);
    }
  }
}