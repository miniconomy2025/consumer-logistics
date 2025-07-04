import { Router } from 'express';
import { PickupController } from '../controllers/pickupController';

const router = Router();
const pickupController = new PickupController();

// --- Search and Analytics Routes (must come before parameterized routes) ---
router.get('/search', pickupController.searchPickups);
router.get('/recent', pickupController.getRecentPickups);
router.get('/pending', pickupController.getPendingPickups);
router.get('/analytics', pickupController.getPickupAnalytics);
router.get('/statuses', pickupController.getPickupStatuses);

// --- Basic CRUD Routes ---
router.post('/', pickupController.createPickup);
router.get('/', pickupController.getAllPickups);
router.get('/:id', pickupController.getPickupById);
router.put('/:id', pickupController.updatePickup);
router.delete('/:id', pickupController.deletePickup);

export default router;