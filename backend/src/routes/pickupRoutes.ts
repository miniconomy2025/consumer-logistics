import { Router } from 'express';
import { PickupController } from '../controllers/PickupController';

const router = Router();

// GET /api/pickup-status/:pickupId
router.get('/pickup/:pickupId', PickupController.getPickupStatus);

export default router;
