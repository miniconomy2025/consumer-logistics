import { AppDataSource } from '../database/config';
import { logger } from '../utils/logger';
import { PickupStatusEntity } from '../database/models/PickupStatusEntity';
import { ServiceTypeEntity } from '../database/models/ServiceTypeEntity';
import { TruckTypeEntity } from '../database/models/TruckTypeEntity';
import { TimeManager } from './timeManager';
import { BankAccountService } from './bankAccountService';
import { TruckPurchaseService } from './truckPurchaseService';
import { getTrucksForSaleWithRetries } from './truckPurchaseService';
import { selectTrucksToBuy, calculateTruckCosts, TruckToBuy } from '../utils/truckPurchaseUtils';


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
    // Step 1: Seed core database entities (critical - must succeed)
    await this.seedCoreEntities();

    // Step 2: Initialize business services (resilient - can fail gracefully)
    await this.initializeBusinessServices();
  }

  private static async seedCoreEntities(): Promise<void> {
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
      logger.info('Core entities seeded successfully.');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error seeding core entities, rolling back transaction:', error);
      throw error; 
    } finally {
      await queryRunner.release();
    }
  }

  private static async initializeBusinessServices(): Promise<void> {
    logger.info('[SimulationResetService] Initializing business services...');

    // Step 1: Create bank account with retries
    await this.createBankAccountWithRetries();

    // Step 2: Initialize truck fleet with fallbacks
    await this.initializeTruckFleetWithFallbacks();
  }

  private static async createBankAccountWithRetries(maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[SimulationResetService] Creating bank account (attempt ${attempt}/${maxRetries})...`);
        const bankAccountService = new BankAccountService();
        await bankAccountService.createBankAccount();
        logger.info('Bank account created successfully.');
        return;
      } catch (error) {
        logger.warn(`[SimulationResetService] Bank account creation failed (attempt ${attempt}/${maxRetries}):`, error);
        if (attempt === maxRetries) {
          logger.error('[SimulationResetService] Bank account creation failed after all retries. Proceeding without bank account.');
          return; // Continue without bank account
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  private static async initializeTruckFleetWithFallbacks(): Promise<void> {
    try {
      // Step 1: Try to get trucks for sale from external service
      const trucksForSale = await this.getTrucksForSaleWithResilience();
      
      // Step 2: Select trucks to buy and calculate costs
      const { trucksToBuy, loanAmount } = this.calculateTruckRequirements(trucksForSale);

      // Step 3: Apply for loan with fallbacks
      await this.applyForLoanWithResilience(loanAmount);

      // Step 4: Purchase trucks
      await this.purchaseTrucksWithResilience(trucksToBuy);

    } catch (error) {
      logger.error('[SimulationResetService] Truck fleet initialization failed:', error);
      logger.warn('[SimulationResetService] Proceeding with minimal truck setup...');
      
      // Fallback: Create minimal truck setup
      await this.createMinimalTruckSetup();
    }
  }

  private static async getTrucksForSaleWithResilience(): Promise<any[]> {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
      logger.info(`[SimulationResetService] Attempting to get trucks for sale (attempt ${attempt}/${maxRetries})...`);
      const trucksForSale = await getTrucksForSaleWithRetries(3);
      
      if (trucksForSale && trucksForSale.length > 0) {
        logger.info(`[SimulationResetService] Retrieved ${trucksForSale.length} trucks for sale.`);
        return trucksForSale;
      } else {
        logger.warn('[SimulationResetService] No trucks available for sale from external service.');
        if (attempt === maxRetries) {
        return [];
        }
      }
      } catch (error) {
      logger.warn(`[SimulationResetService] Failed to get trucks for sale (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt === maxRetries) {
        logger.error('[SimulationResetService] Failed to get trucks for sale after all retries.');
        return [];
      }
      }
      
      // Exponential backoff before next retry
      const delay = Math.pow(2, attempt) * 1000;
      logger.info(`[SimulationResetService] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return [];
  }

  private static calculateTruckRequirements(trucksForSale: any[]): { trucksToBuy: TruckToBuy[], loanAmount: number } {
    let trucksToBuy: TruckToBuy[];
    let loanAmount: number;

    if (trucksForSale && trucksForSale.length > 0) {
      trucksToBuy = selectTrucksToBuy(trucksForSale);
      const { totalPurchase, totalDailyOperating } = calculateTruckCosts(trucksToBuy);
      loanAmount = totalPurchase + (totalDailyOperating * 14);
      logger.info(`[SimulationResetService] Calculated loan amount: ${loanAmount} for ${trucksToBuy.length} trucks.`);
    } else {
      // Fallback truck configuration
      const fallbackTruckName = 'Small Truck';
      trucksToBuy = [
        { truckName: fallbackTruckName, quantityToBuy: 3, price: 10000, operatingCost: 500, maximumLoad: 2000 }
      ];
      loanAmount = 51000;
      logger.info('[SimulationResetService] Using fallback truck configuration.');
    }

    return { trucksToBuy, loanAmount };
  }

  private static async applyForLoanWithResilience(loanAmount: number): Promise<void> {
    try {
      logger.info(`[SimulationResetService] Applying for loan of ${loanAmount}...`);
      const bankAccountService = new BankAccountService();
      const { response: loanResult, attemptedAmount } = await bankAccountService.applyForLoanWithFallback(loanAmount);

      if (loanResult.success) {
        logger.info(`[SimulationResetService] Loan application successful for ${attemptedAmount}.`);
      } else {
        logger.warn(`[SimulationResetService] Loan application failed for ${attemptedAmount}. Proceeding without loan.`);
      }
    } catch (error) {
      logger.warn('[SimulationResetService] Loan application failed with error:', error);
      logger.info('[SimulationResetService] Proceeding without loan.');
    }
  }

  private static async purchaseTrucksWithResilience(trucksToBuy: TruckToBuy[]): Promise<void> {
    try {
      logger.info(`[SimulationResetService] Purchasing ${trucksToBuy.length} trucks...`);
      const truckPurchaseService = new TruckPurchaseService();
      await truckPurchaseService.purchaseTrucksWithPreselected(trucksToBuy);
      logger.info('[SimulationResetService] Trucks purchased successfully.');
    } catch (error) {
      logger.error('[SimulationResetService] Truck purchase failed:', error);
      throw error; // Re-throw to trigger fallback
    }
  }

  private static async createMinimalTruckSetup(): Promise<void> {
    try {
      logger.info('[SimulationResetService] Creating minimal truck setup...');
      const truckPurchaseService = new TruckPurchaseService();
      
      // Create basic trucks without external dependencies
      const minimalTrucks: TruckToBuy[] = [
        { truckName: 'Small Truck', quantityToBuy: 2, price: 8000, operatingCost: 400, maximumLoad: 1500 }
      ];
      
      await truckPurchaseService.purchaseTrucksWithPreselected(minimalTrucks);
      logger.info('[SimulationResetService] Minimal truck setup created successfully.');
    } catch (error) {
      logger.error('[SimulationResetService] Minimal truck setup failed:', error);
      logger.warn('[SimulationResetService] Simulation will proceed without trucks.');
    }
  }
}