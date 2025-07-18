import { Router } from 'express';
import { TruckController } from '../controllers/truckController';
import { TruckManagementService } from '../services/truckManagementService';
import { TruckRepository } from '../repositories/implementations/TruckRepository';


const truckRepository = new TruckRepository();
const truckManagementService = new TruckManagementService(truckRepository);
const truckController = new TruckController(truckManagementService);

const router = Router();

// Truck Type Routes
router.post('/types', truckController.createTruckType);
router.get('/types', truckController.getAllTruckTypes);
router.get('/types/:id', truckController.getTruckTypeById);
router.delete('/types/:id', truckController.deleteTruckType);

// Truck Routes
router.post('/', truckController.createTruck);
router.get('/', truckController.getAllTrucks);
router.get('/:id', truckController.getTruckById);
router.put('/:id', truckController.updateTruck);
router.delete('/:id', truckController.deleteTruck);
router.post('/failure', truckController.bulkBreakdown);

export default router;