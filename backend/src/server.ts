import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import app from './app';
import { AppDataSource } from './database/config';
import { logger } from './utils/logger';
import { SQSWorkerService } from './services/sqsWorkerService';
import { LogisticsPlanningService } from './services/logisticsPlanningService';
import { SimulationService } from './services/simulationService';
import { PickupService } from './services/pickupService';
import { PickupRepository } from './repositories/implementations/PickupRepository';
import { LogisticsDetailsRepository } from './repositories/implementations/LogisticsDetailsRepository';
import { CompanyRepository } from './repositories/implementations/CompanyRepository';
import { TruckRepository } from './repositories/implementations/TruckRepository';
import { TruckAllocationRepository } from './repositories/implementations/TruckAllocationRepository';

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

    const simulationService = new SimulationService();
    const pickupService = new PickupService(
      new PickupRepository(),
      new CompanyRepository(),
      simulationService,
      new LogisticsPlanningService(
        simulationService,
        new LogisticsDetailsRepository(),
        new TruckRepository(),
        new PickupRepository(),
        new TruckAllocationRepository()
      )
    );

    const sqsWorkerService = new SQSWorkerService(
      pickupService['logisticsPlanningService'],
      simulationService,
      pickupService
    );

    sqsWorkerService.startPollingPickupQueue();
    sqsWorkerService.startPollingDeliveryQueue();
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
