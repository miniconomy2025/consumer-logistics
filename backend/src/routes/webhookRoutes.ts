import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { FinancialNotificationService } from '../services/financialNotificationService';
import { PickupService } from '../services/pickupService';
import { LogisticsPlanningService } from '../services/logisticsPlanningService';
import { SimulationService } from '../services/simulationService';
import { PickupRepository } from '../repositories/implementations/PickupRepository';
import { CompanyRepository } from '../repositories/implementations/CompanyRepository';
import { LogisticsDetailsRepository } from '../repositories/implementations/LogisticsDetailsRepository';
import { TruckRepository } from '../repositories/implementations/TruckRepository';
import { TruckAllocationRepository } from '../repositories/implementations/TruckAllocationRepository';
import { sqsClient } from '../config/awsSqs';


const pickupRepository = new PickupRepository();
const companyRepository = new CompanyRepository();
const logisticsDetailsRepository = new LogisticsDetailsRepository();
const truckRepository = new TruckRepository();
const truckAllocationRepository = new TruckAllocationRepository();

const simulationService = new SimulationService();

const logisticsPlanningService = new LogisticsPlanningService(
    simulationService,
    logisticsDetailsRepository,
    truckRepository,
    pickupRepository,
    truckAllocationRepository,
    sqsClient
);

const pickupService = new PickupService(
    pickupRepository,
    companyRepository,
    simulationService,
    logisticsPlanningService
);

const financialNotificationService = new FinancialNotificationService(
    pickupService,
    logisticsPlanningService,
    simulationService
);

const webhookController = new WebhookController(financialNotificationService);

const router = Router();

router.post('/payment-updates', webhookController.handleCommercialBankPaymentNotification);

export default router;