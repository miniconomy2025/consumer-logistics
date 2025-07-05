import { Request, Response, NextFunction } from 'express';
import { PickupService } from '../services/pickupRequestService';
import { PickupRepository } from '../repositories/implementations/PickupRepository';
import { AppError } from '../shared/errors/ApplicationError';
import { CreatePickupRequest, PickupResponse } from '../types/dtos/pickupDtos';

export class PickupController {
  private pickupService: PickupService;

  constructor(pickupService: PickupService = new PickupService(new PickupRepository())) {
    this.pickupService = pickupService;
  }

  public createPickup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreatePickupRequest = req.body;
      if (
        typeof data.quantity !== 'number' ||
        !data.pickupFrom ||
        !data.deliveryTo
      ) {
        throw new AppError('Invalid request body: pickupFrom, quantity, and deliveryTo are required.', 400);
      }
      const result: PickupResponse = await this.pickupService.createPickupRequest(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}