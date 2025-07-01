import { Request, Response, NextFunction } from 'express';
import { PickupEntity } from '../database/models/PickupEntity';
import { AppDataSource } from '../database/config';

export class PickupController {
  // GET /api/pickup-status/:pickupId
  static async getPickupStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const pickupId = parseInt(req.params.pickupId, 10);
      if (isNaN(pickupId)) {
        return res.status(400).json({ error: 'Invalid pickupId' });
      }

      const pickupRepo = AppDataSource.getRepository(PickupEntity);
      const pickup = await pickupRepo.findOne({
        where: { pickup_id: pickupId },
        relations: ['pickupStatus']
      });

      if (!pickup) {
        return res.status(404).json({ error: 'Pickup not found' });
      }

      return res.json({
        pickup_id: pickup.pickup_id,
        pickup_status: pickup.pickupStatus?.pick_status_name || null
      });
    } catch (err) {
      next(err);
      return;
    }
  }
}
