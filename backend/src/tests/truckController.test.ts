import { Request, Response, NextFunction } from 'express';
import { TruckController } from '../controllers/truckController';
import { TruckManagementService } from '../services/truckManagementService';
import { TruckEntity } from '../database/models/TruckEntity';
import { TruckTypeEntity } from '../database/models/TruckTypeEntity';
import { TimeManager } from '../services/timeManager';

jest.mock('../utils/logger');
jest.mock('../services/timeManager');

describe('TruckController', () => {
  let controller: TruckController;
  let mockService: jest.Mocked<TruckManagementService>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const mockTruckType: TruckTypeEntity = {
    truck_type_id: 1,
    truck_type_name: 'Standard',
  } as TruckTypeEntity;

  const mockTruck: TruckEntity = {
    truck_id: 1,
    truck_type_id: 1,
    truckType: mockTruckType,
    max_pickups: 5,
    max_dropoffs: 5,
    daily_operating_cost: 100,
    max_capacity: 1000,
    is_available: true,
  } as TruckEntity;

  beforeEach(() => {
    mockService = {
      createTruckType: jest.fn(),
      getTruckTypeById: jest.fn(),
      getAllTruckTypes: jest.fn(),
      deleteTruckType: jest.fn(),
      createTruck: jest.fn(),
      getTruckById: jest.fn(),
      getAllTrucks: jest.fn(),
      updateTruck: jest.fn(),
      deleteTruck: jest.fn(),
      breakdownTrucksByType: jest.fn(),
      restoreTrucksByType: jest.fn(),
    } as any;

    controller = new TruckController(mockService);
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    req = { body: {}, params: {} };
    next = jest.fn();
  });

  describe('Truck Type Operations', () => {
    it('should create truck type', async () => {
      req.body = { truckTypeName: 'Large' };
      mockService.createTruckType.mockResolvedValue({ truck_type_id: 1, truck_type_name: 'Large' } as TruckTypeEntity);

      await controller.createTruckType(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ truckTypeId: 1, truckTypeName: 'Large' });
    });

    it('should get truck type by id', async () => {
      req.params = { id: '1' };
      mockService.getTruckTypeById.mockResolvedValue(mockTruckType);

      await controller.getTruckTypeById(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle invalid truck type id', async () => {
      req.params = { id: 'invalid' };

      await controller.getTruckTypeById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('should get all truck types', async () => {
      mockService.getAllTruckTypes.mockResolvedValue([mockTruckType]);

      await controller.getAllTruckTypes(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totalCount: 1 }));
    });

    it('should delete truck type', async () => {
      req.params = { id: '1' };
      mockService.deleteTruckType.mockResolvedValue(true);

      await controller.deleteTruckType(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('Truck Operations', () => {
    it('should create truck', async () => {
      req.body = { truckTypeId: 1, maxPickups: 5, maxDropoffs: 5, dailyOperatingCost: 100, maxCapacity: 1000 };
      mockService.createTruck.mockResolvedValue([mockTruck]);

      await controller.createTruck(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ quantityCreated: 1 }));
    });

    it('should reject invalid quantity', async () => {
      req.body = { truckTypeId: 1, maxPickups: 5, maxDropoffs: 5, dailyOperatingCost: 100, maxCapacity: 1000, quantity: 0 };

      await controller.createTruck(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('should get truck by id', async () => {
      req.params = { id: '1' };
      mockService.getTruckById.mockResolvedValue(mockTruck);

      await controller.getTruckById(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should get all trucks', async () => {
      mockService.getAllTrucks.mockResolvedValue([mockTruck]);

      await controller.getAllTrucks(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totalCount: 1 }));
    });

    it('should update truck', async () => {
      req.params = { id: '1' };
      req.body = { maxCapacity: 1500 };
      mockService.updateTruck.mockResolvedValue({ ...mockTruck, max_capacity: 1500 } as TruckEntity);

      await controller.updateTruck(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should delete truck', async () => {
      req.params = { id: '1' };
      mockService.deleteTruck.mockResolvedValue(true);

      await controller.deleteTruck(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('Bulk Breakdown', () => {
    it('should mark trucks unavailable', async () => {
      const mockTimeManager = {
        getCurrentTime: jest.fn().mockReturnValue(new Date()),
      };
      (TimeManager.getInstance as jest.Mock).mockReturnValue(mockTimeManager);

      req.body = { truckName: 'Standard', failureQuantity: 3 };
      mockService.breakdownTrucksByType.mockResolvedValue(3);

      await controller.bulkBreakdown(req as Request, res as Response, next);

      expect(mockService.breakdownTrucksByType).toHaveBeenCalledWith('Standard', 3);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should reject invalid breakdown request', async () => {
      req.body = { truckName: '', failureQuantity: 3 };

      await controller.bulkBreakdown(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });
});
