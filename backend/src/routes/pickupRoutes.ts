import { Router } from 'express';
import { PickupController } from '../controllers/pickupController';

const router = Router();
const pickupController = new PickupController();

router.post('/', pickupController.createPickup);

export default router;