import { Router } from 'express';
import { PickupController } from '../controllers/pickupController';
import { PickupService } from '../services/pickupService';
import { PickupRepository } from '../repositories/implementations/PickupRepository';
import { CompanyRepository } from '../repositories/implementations/CompanyRepository';
import { TimeManager } from '../services/timeManager';
import { LogisticsPlanningService } from '../services/logisticsPlanningService';
import { TruckRepository } from '../repositories/implementations/TruckRepository';
import { LogisticsDetailsRepository } from '../repositories/implementations/LogisticsDetailsRepository';
import { TruckAllocationRepository } from '../repositories/implementations/TruckAllocationRepository';
import { sqsClient } from '../config/awsSqs';

// Repositories and shared services
const pickupRepository = new PickupRepository();
const companyRepository = new CompanyRepository();
const logisticsDetailsRepository = new LogisticsDetailsRepository();
const truckRepository = new TruckRepository();
const truckAllocationRepository = new TruckAllocationRepository();
const timeManager = TimeManager.getInstance(); // singleton

// Instantiate PickupService with a placeholder (we'll inject logisticsPlanningService later)
const pickupService = new PickupService(
  pickupRepository,
  companyRepository,
  timeManager,
  undefined // Temporarily pass undefined for logisticsPlanningService
);

// Instantiate LogisticsPlanningService (now pickupService is available)
const logisticsPlanningService = new LogisticsPlanningService(
  timeManager,
  logisticsDetailsRepository,
  truckRepository,
  pickupRepository,
  truckAllocationRepository,
  pickupService,
  sqsClient
);

// Inject the logisticsPlanningService into the pickupService to resolve circular dependency
pickupService.setLogisticsPlanningService(logisticsPlanningService);

// Setup controller and routes
const pickupController = new PickupController(pickupService);
const router = Router();

router.post('/', pickupController.createPickup);
router.get('/', pickupController.getPickupsForCompany);

export default router;
