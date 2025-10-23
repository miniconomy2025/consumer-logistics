import { Request, Response, NextFunction } from 'express';
import { PickupController } from '../controllers/pickupController';
import { PickupService } from '../services/pickupService';
import { TimeManager } from '../services/timeManager';

jest.mock('../utils/logger');
jest.mock('../services/timeManager');

describe('PickupController', () => {
  let controller: PickupController;
  let mockService: jest.Mocked<PickupService>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const mockPickupResponse = {
    pickup_id: 1,
    phone_units: 5,
    company: { company_name: 'pear-company' },
    pickup_status: { status_name: 'PENDING' },
    recipient_name: 'John',
    model_name: 'ModelX',
    invoice: { total_amount: 100, paid: false }
  } as any;

  beforeEach(() => {
    mockService = {
      createPickupRequest: jest.fn(),
      getPickupsForCompany: jest.fn(),
    } as any;

    controller = new PickupController(mockService as any);
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    req = { body: {}, params: {}, query: {} };
    next = jest.fn();
  });

  describe('createPickup', () => {
    it('should create pickup when request is valid', async () => {
      (req as any).clientName = 'pear-company';
      req.body = { quantity: 3, modelName: 'ModelY', recipient: 'Alice' };
      mockService.createPickupRequest.mockResolvedValue({ pickupId: 1, status: 'CREATED' } as any);

      await controller.createPickup(req as Request, res as Response, next);

      expect(mockService.createPickupRequest).toHaveBeenCalledWith({ companyName: 'pear-company', quantity: 3, modelName: 'ModelY', recipient: 'Alice' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ pickupId: 1 }));
    });

    it('should return 400 when companyName missing or quantity invalid', async () => {
      // missing clientName
      req.body = { quantity: 2 };

      await controller.createPickup(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });

  describe('getPickupsForCompany', () => {
    it('should return 400 when company_name not provided', async () => {
      req.query = {};

      await controller.getPickupsForCompany(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('should return pickups list when valid company_name provided', async () => {
      req.query = { company_name: 'pear-company' } as any;
      mockService.getPickupsForCompany.mockResolvedValue([mockPickupResponse]);

      await controller.getPickupsForCompany(req as Request, res as Response, next);

      expect(mockService.getPickupsForCompany).toHaveBeenCalledWith({ company_name: 'pear-company', status: undefined });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
    });
  });
});
