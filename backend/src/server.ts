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
import { BankAccountEntity } from './database/models/BankAccountEntity';
import { getTrucksForSale } from './services/truckMarketService';
import { selectTrucksToBuy, calculateTruckCosts } from './utils/truckPurchaseUtils';
import { applyForLoan } from './services/loanService';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const port = process.env.PORT || 3000;
const DEFAULT_ACCOUNT_NUMBER = process.env.DEFAULT_ACCOUNT_NUMBER || '0000000000';

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

let server: ReturnType<typeof app.listen>;

AppDataSource.initialize()
  .then(async () => {
    logger.info('Data Source has been initialized successfully.');

    const bankAccountRepo = AppDataSource.getRepository(BankAccountEntity);
    let bankAccount = await bankAccountRepo.findOneBy({});

    if (!bankAccount) {
      try {
        const response = await fetch('https://<bank-api-domain>/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (!response.ok) {
          throw new Error(`Bank API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const accountNumber = data.account_number;
        logger.info(`Bank account created: ${accountNumber}`);

        bankAccount = bankAccountRepo.create({ account_number: accountNumber });
        await bankAccountRepo.save(bankAccount);
        logger.info('Bank account number saved to DB.');
      } catch (err) {
        logger.error('Failed to create or save bank account:', err);
        logger.warn(`Using default account number from .env: ${DEFAULT_ACCOUNT_NUMBER}`);
        bankAccount = bankAccountRepo.create({ account_number: DEFAULT_ACCOUNT_NUMBER });
        await bankAccountRepo.save(bankAccount);
      }
    } else {
      logger.info(`Bank account already exists in DB: ${bankAccount.account_number}`);
    }

    // Fetch available trucks
    const trucksForSale = await getTrucksForSale();
    logger.info('Fetched trucks for sale:', trucksForSale);

    const trucksToBuy = selectTrucksToBuy(trucksForSale);
    logger.info('Trucks to buy:', trucksToBuy);

    const { totalPurchase, totalDailyOperating } = calculateTruckCosts(trucksToBuy);
    logger.info(`Total purchase cost: ${totalPurchase}, Total daily operating cost: ${totalDailyOperating}`);

    const daysToCover = 7; // Change this to however many days of operating costs you want to cover
    const loanAmount = totalPurchase + (totalDailyOperating * daysToCover);
    logger.info(`Requesting loan amount: ${loanAmount} (includes ${daysToCover} days of operating costs)`);

    try {
      const loanResult = await applyForLoan(loanAmount);
      if (loanResult.success) {
        logger.info(`Loan approved! Loan number: ${loanResult.loan_number}`);
      
      } else {
        logger.error('Loan application was not successful.');
        throw new Error('Loan application failed');
      }
    } catch (err) {
      logger.error('Error applying for loan:', err);
      throw err;
    }

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
