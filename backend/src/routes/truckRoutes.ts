import { Router } from 'express';
import { TruckController } from '../controllers/truckController';

const router = Router();
const truckController = new TruckController();

// --- Truck Type Routes ---
router.post('/types', truckController.createTruckType);
router.get('/types', truckController.getAllTruckTypes);
router.get('/types/:id', truckController.getTruckTypeById);
//router.put('/types/:id', truckController.updateTruckType);
router.delete('/types/:id', truckController.deleteTruckType);


// --- Truck Routes ---
router.post('/', truckController.createTruck);
router.get('/', truckController.getAllTrucks);
router.get('/:id', truckController.getTruckById);
router.put('/:id', truckController.updateTruck);
router.delete('/:id', truckController.deleteTruck);

export default router;