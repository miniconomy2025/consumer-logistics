import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { FinancialNotificationService } from '../services/financialNotificationService';
import { PickupService } from '../services/pickupService';
import { LogisticsPlanningService } from '../services/logisticsPlanningService';
import { TimeManager } from '../services/timeManager';
import { PickupRepository } from '../repositories/implementations/PickupRepository';
import { CompanyRepository } from '../repositories/implementations/CompanyRepository';
import { LogisticsDetailsRepository } from '../repositories/implementations/LogisticsDetailsRepository';
import { TruckRepository } from '../repositories/implementations/TruckRepository';
import { TruckAllocationRepository } from '../repositories/implementations/TruckAllocationRepository';
import { sqsClient } from '../config/awsSqs';

// Create repositories
const pickupRepository = new PickupRepository();
const companyRepository = new CompanyRepository();
const logisticsDetailsRepository = new LogisticsDetailsRepository();
const truckRepository = new TruckRepository();
const truckAllocationRepository = new TruckAllocationRepository();
const timeManager = TimeManager.getInstance();

// Create PickupService with placeholder for logisticsPlanningService
const pickupService = new PickupService(
    pickupRepository,
    companyRepository,
    timeManager,
    undefined // delayed injection
);

// Now create LogisticsPlanningService with pickupService injected
const logisticsPlanningService = new LogisticsPlanningService(
    timeManager,
    logisticsDetailsRepository,
    truckRepository,
    pickupRepository,
    truckAllocationRepository,
    pickupService,
    sqsClient
);

// Resolve circular dependency
pickupService.setLogisticsPlanningService(logisticsPlanningService);

// Create financial service
const financialNotificationService = new FinancialNotificationService(
    pickupService,
    logisticsPlanningService,
    timeManager
);

// Create controller and route
const webhookController = new WebhookController(financialNotificationService);

const router = Router();
router.post('/payment-updates', webhookController.handleCommercialBankPaymentNotification);

export default router;
