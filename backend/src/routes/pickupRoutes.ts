import { Router } from 'express';
import { PickupController } from '../controllers/pickupController';
import { PickupService } from '../services/pickupService';
import { PickupRepository } from '../repositories/implementations/PickupRepository';
import { CompanyRepository } from '../repositories/implementations/CompanyRepository';
import { SimulationService } from '../services/simulationService';
import { LogisticsPlanningService } from '../services/logisticsPlanningService';
import { TruckRepository } from '../repositories/implementations/TruckRepository';
import { LogisticsDetailsRepository } from '../repositories/implementations/LogisticsDetailsRepository';
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

const pickupController = new PickupController(pickupService); 

const router = Router();

router.post('/', pickupController.createPickup);
router.get('/', pickupController.getPickupsForCompany); 

export default router;