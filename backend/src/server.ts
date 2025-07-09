import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import app from './app';
import { AppDataSource } from './database/config';
import { logger } from './utils/logger';
import { SQSWorkerService } from './services/sqsWorkerService';
import { LogisticsPlanningService } from './services/logisticsPlanningService';
import { TimeManager } from './services/timeManager';
import { PickupService } from './services/pickupService';
import { PickupRepository } from './repositories/implementations/PickupRepository';
import { LogisticsDetailsRepository } from './repositories/implementations/LogisticsDetailsRepository';
import { CompanyRepository } from './repositories/implementations/CompanyRepository';
import { TruckRepository } from './repositories/implementations/TruckRepository';
import { TruckAllocationRepository } from './repositories/implementations/TruckAllocationRepository';
import { sqsClient } from './config/awsSqs';
import { TruckPurchaseService } from './services/truckPurchaseService';
import { BankAccountService } from './services/bankAccountService';
import { getTrucksForSale } from './services/truckPurchaseService';
import { selectTrucksToBuy, calculateTruckCosts } from './utils/truckPurchaseUtils';
import { applyForLoanWithFallback } from './services/loanService';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const port = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

let server: ReturnType<typeof app.listen>;

AppDataSource.initialize()
  .then(async () => {
    logger.info('Data Source has been initialized successfully.');
    server = app.listen(port, () => {
      logger.info(` Server running on port ${port}`);
      logger.info(` Environment: ${process.env.NODE_ENV}`);
    });

    const timeManager = TimeManager.getInstance();

    const pickupRepository = new PickupRepository();
    const companyRepository = new CompanyRepository();
    const logisticsDetailsRepository = new LogisticsDetailsRepository();
    const truckRepository = new TruckRepository();
    const truckAllocationRepository = new TruckAllocationRepository();

    const pickupService = new PickupService(
      pickupRepository,
      companyRepository,
      timeManager,
      undefined
    );

    const logisticsPlanningService = new LogisticsPlanningService(
      timeManager,
      logisticsDetailsRepository,
      truckRepository,
      pickupRepository,
      truckAllocationRepository,
      pickupService,
      sqsClient
    );

    pickupService.setLogisticsPlanningService(logisticsPlanningService);

    const sqsWorkerService = new SQSWorkerService(
      logisticsPlanningService,
      timeManager,
      pickupService,
      sqsClient
    );

    timeManager.onMidnight(async (simTime) => {
      logger.info(`Midnight Tick! Sim Time: ${simTime.toISOString()}`);
      try {
        await logisticsPlanningService.replanPendingOrFailed();
      } catch (err: any) {
        logger.error('Error during logistics reattempt at midnight:', err);
      }
    });

    sqsWorkerService.startPollingPickupQueue();
    sqsWorkerService.startPollingDeliveryQueue();

    if (process.env.ENABLE_TIME_MANAGER_CLOCK === 'true') {
      timeManager.startSimulation(undefined, undefined, 1000);
      logger.info('TimeManager internal clock started.');

      const truckPurchaseService = new TruckPurchaseService();
      await truckPurchaseService.purchaseTrucksFullFlow(14);

    } else {
      logger.warn('TimeManager internal clock is NOT enabled. Time will only advance via API or manual sync.');
    }
  })
  .catch((error) => {
    logger.error('Failed to connect to the database or start the server:', error);
    process.exit(1);
  });

process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', { reason, promise });
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
