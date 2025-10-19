import { getTrucksForSale, getTrucksForSaleWithRetries, TruckPurchaseService } from '../services/truckPurchaseService';
import { AppDataSource } from '../database/config';
import { TruckManagementService } from '../services/truckManagementService';

jest.mock('../database/config');
jest.mock('../services/truckManagementService');
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

describe('TruckPurchaseService + helper functions', () => {
  let mockRepo: any;
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = { count: jest.fn() };
    (AppDataSource as any).getRepository = jest.fn().mockReturnValue(mockRepo);
  });

  describe('getTrucksForSale', () => {
    it('returns trucks when external API responds ok', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ truckName: 'small_truck', price: 1000, quantity: 3, operatingCost: 50, maximumLoad: 1200 }]
      });
      const res = await getTrucksForSale();
      expect(res).toBeInstanceOf(Array);
      expect(res[0].truckName).toBe('small_truck');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/trucks'), expect.any(Object));
    });

    it('throws when external API responds not ok', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway'
      });
      await expect(getTrucksForSale()).rejects.toThrow('Failed to fetch trucks: 502 Bad Gateway');
    });
  });

  describe('getTrucksForSaleWithRetries', () => {
    it('retries and succeeds on later attempt', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ truckName: 'small_truck' }]
        });
      const res = await getTrucksForSaleWithRetries(3);
      expect(res).toBeInstanceOf(Array);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('returns null after all attempts fail', async () => {
      (fetch as jest.Mock)
        .mockResolvedValue({ ok: false, status: 502, statusText: 'Bad Gateway' });
      const res = await getTrucksForSaleWithRetries(2);
      expect(res).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('TruckPurchaseService.purchaseTrucksWithPreselected', () => {
    it('skips purchase when trucks already exist', async () => {
      mockRepo.count.mockResolvedValueOnce(5);
      const service = new TruckPurchaseService();
      await service.purchaseTrucksWithPreselected([{ truckName: 'small_truck', quantityToBuy: 1, price: 1000, operatingCost: 50, maximumLoad: 1200 } as any]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('attempts to order, pay and register trucks when none exist', async () => {
      mockRepo.count.mockResolvedValueOnce(0);

      // order POST -> ok + order payload
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            orderId: 123,
            truckName: 'small_truck',
            totalPrice: 2000,
            maximumLoad: 1200,
            operatingCostPerDay: '50',
            quantity: 2,
            bankAccount: 'TREASURY_ACCOUNT'
          })
        })
        // payment POST -> ok
        .mockResolvedValueOnce({ ok: true, text: async () => 'ok' });

      // TruckManagementService mocks: getTruckTypeByName and createTruck
      const getTypeSpy = jest.spyOn(TruckManagementService.prototype as any, 'getTruckTypeByName')
        .mockResolvedValue({ truck_type_id: 10, truck_type_name: 'Small Truck' });
      const createSpy = jest.spyOn(TruckManagementService.prototype as any, 'createTruck')
        .mockResolvedValue([{ truck_id: 1 }, { truck_id: 2 }]);

      const service = new TruckPurchaseService();
      await service.purchaseTrucksWithPreselected([{
        truckName: 'small_truck',
        quantityToBuy: 2,
        price: 1000,
        operatingCost: 50,
        maximumLoad: 1200
      } as any]);

      // order + payment => 2 fetch calls
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(getTypeSpy).toHaveBeenCalledWith('Small Truck');
      expect(createSpy).toHaveBeenCalled();
    });

    it('continues when external order fails and does not register trucks', async () => {
      mockRepo.count.mockResolvedValueOnce(0);

      // order POST -> not ok
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Err' });

      const createSpy = jest.spyOn(TruckManagementService.prototype as any, 'createTruck')
        .mockResolvedValue([]);

      const service = new TruckPurchaseService();
      await service.purchaseTrucksWithPreselected([{
        truckName: 'small_truck',
        quantityToBuy: 1,
        price: 1000,
        operatingCost: 50,
        maximumLoad: 1200
      } as any]);

      expect(fetch).toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('continues when payment fails and does not register trucks', async () => {
      mockRepo.count.mockResolvedValueOnce(0);

      // order ok
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            orderId: 321,
            truckName: 'small_truck',
            totalPrice: 1500,
            maximumLoad: 1200,
            operatingCostPerDay: '40',
            quantity: 1,
            bankAccount: '12345'
          })
        })
        // payment not ok
        .mockResolvedValueOnce({ ok: false, text: async () => 'insufficient' });

      const createSpy = jest.spyOn(TruckManagementService.prototype as any, 'createTruck')
        .mockResolvedValue([]);

      const service = new TruckPurchaseService();
      await service.purchaseTrucksWithPreselected([{
        truckName: 'small_truck',
        quantityToBuy: 1,
        price: 1500,
        operatingCost: 40,
        maximumLoad: 1200
      } as any]);

      // two fetch calls (order + payment)
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});