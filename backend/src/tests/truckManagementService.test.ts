import { TruckManagementService } from '../services/truckManagementService';
import { AppError } from '../shared/errors/ApplicationError';
import { TruckEntity } from '../database/models/TruckEntity';
import { TruckTypeEntity } from '../database/models/TruckTypeEntity';

const mockRepo = {
  findTruckTypeById: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createTruckType: jest.fn(),
  findTruckTypeByName: jest.fn(),
  findAllTruckTypes: jest.fn(),
  updateTruckType: jest.fn(),
  deleteTruckType: jest.fn(),
  markNTrucksUnavailableByTypeName: jest.fn(),
  restoreUnavailableTrucksByTypeName: jest.fn(),
};

describe('TruckManagementService', () => {
  let service: TruckManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TruckManagementService(mockRepo as any);
  });

  describe('createTruck', () => {
    it('throws if truck type not found', async () => {
      mockRepo.findTruckTypeById.mockResolvedValue(null);
      await expect(service.createTruck({
        truckTypeId: 1,
        maxPickups: 1,
        maxDropoffs: 1,
        dailyOperatingCost: 100,
        maxCapacity: 1000,
      })).rejects.toThrow(AppError);
    });

    it('throws if quantity <= 0', async () => {
      mockRepo.findTruckTypeById.mockResolvedValue({} as TruckTypeEntity);
      await expect(service.createTruck({
        truckTypeId: 1,
        maxPickups: 1,
        maxDropoffs: 1,
        dailyOperatingCost: 100,
        maxCapacity: 1000,
        quantity: 0,
      })).rejects.toThrow(AppError);
    });

    it('creates specified quantity of trucks', async () => {
      mockRepo.findTruckTypeById.mockResolvedValue({} as TruckTypeEntity);
      mockRepo.create.mockImplementation(async (payload) => ({ truck_id: Math.floor(Math.random() * 1000), ...payload } as TruckEntity));
      const created = await service.createTruck({
        truckTypeId: 2,
        maxPickups: 2,
        maxDropoffs: 2,
        dailyOperatingCost: 200,
        maxCapacity: 1500,
        quantity: 3,
      });
      expect(mockRepo.create).toHaveBeenCalledTimes(3);
      expect(created).toHaveLength(3);
    });
  });

  describe('getTruckById & getAllTrucks', () => {
    it('returns truck by id', async () => {
      mockRepo.findById.mockResolvedValue({ truck_id: 10 } as TruckEntity);
      const t = await service.getTruckById(10);
      expect(t).toEqual({ truck_id: 10 });
    });

    it('returns all trucks', async () => {
      mockRepo.findAll.mockResolvedValue([{ truck_id: 1 }] as TruckEntity[]);
      const all = await service.getAllTrucks();
      expect(all.length).toBe(1);
    });
  });

  describe('updateTruck', () => {
    it('throws when updating to non-existent truck type', async () => {
      mockRepo.findTruckTypeById.mockResolvedValue(null);
      await expect(service.updateTruck(1, { truckTypeId: 99 })).rejects.toThrow(AppError);
    });

    it('updates and returns truck when valid', async () => {
      mockRepo.findTruckTypeById.mockResolvedValue({} as TruckTypeEntity);
      mockRepo.update.mockResolvedValue({ truck_id: 1, max_capacity: 1000 } as TruckEntity);
      const updated = await service.updateTruck(1, { maxCapacity: 1000, truckTypeId: 1 });
      expect(updated).toEqual({ truck_id: 1, max_capacity: 1000 });
      expect(mockRepo.update).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });

  describe('deleteTruck', () => {
    it('returns true when deleted', async () => {
      mockRepo.delete.mockResolvedValue(true);
      const res = await service.deleteTruck(5);
      expect(res).toBe(true);
    });

    it('returns false when not found', async () => {
      mockRepo.delete.mockResolvedValue(false);
      const res = await service.deleteTruck(999);
      expect(res).toBe(false);
    });
  });

  describe('truck type operations', () => {
    it('creates truck type', async () => {
      mockRepo.createTruckType.mockResolvedValue({ truck_type_id: 7, truck_type_name: 'Small Truck' } as TruckTypeEntity);
      const t = await service.createTruckType({ truckTypeName: 'Small Truck' });
      expect(t.truck_type_name).toBe('Small Truck');
    });

    it('gets truck type by id/name and all types', async () => {
      mockRepo.findTruckTypeById.mockResolvedValue({ truck_type_id: 2 } as TruckTypeEntity);
      mockRepo.findTruckTypeByName.mockResolvedValue({ truck_type_id: 3, truck_type_name: 'X' } as TruckTypeEntity);
      mockRepo.findAllTruckTypes.mockResolvedValue([{ truck_type_id: 2 }] as TruckTypeEntity[]);
      const byId = await service.getTruckTypeById(2);
      const byName = await service.getTruckTypeByName('X');
      const all = await service.getAllTruckTypes();
      expect(byId).toEqual({ truck_type_id: 2 });
      expect(byName?.truck_type_name).toBe('X');
      expect(all.length).toBe(1);
    });

    it('updates and deletes truck type', async () => {
      mockRepo.updateTruckType.mockResolvedValue({ truck_type_id: 4, truck_type_name: 'Updated' } as TruckTypeEntity);
      mockRepo.deleteTruckType.mockResolvedValue(true);
      const updated = await service.updateTruckType(4, { truckTypeName: 'Updated' });
      const deleted = await service.deleteTruckType(4);
      expect(updated?.truck_type_name).toBe('Updated');
      expect(deleted).toBe(true);
    });
  });

  describe('breakdown and restore', () => {
    it('marks N trucks unavailable', async () => {
      mockRepo.markNTrucksUnavailableByTypeName.mockResolvedValue(2);
      const n = await service.breakdownTrucksByType('Small Truck', 2);
      expect(n).toBe(2);
    });

    it('restores unavailable trucks', async () => {
      mockRepo.restoreUnavailableTrucksByTypeName.mockResolvedValue(3);
      const n = await service.restoreTrucksByType('Small Truck');
      expect(n).toBe(3);
    });
  });
});