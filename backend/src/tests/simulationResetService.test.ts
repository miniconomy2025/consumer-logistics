import { SimulationResetService } from '../services/simulationResetService';
import { AppDataSource } from '../database/config';

jest.mock('../database/config');

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

jest.mock('../services/timeManager', () => ({
  TimeManager: {
    getInstance: jest.fn().mockReturnValue({ reset: jest.fn() })
  }
}));

jest.mock('../services/bankAccountService', () => ({
  BankAccountService: jest.fn().mockImplementation(() => ({
    createBankAccount: jest.fn(),
    applyForLoanWithFallback: jest.fn()
  }))
}));

jest.mock('../services/truckPurchaseService', () => {
  const purchaseMock = jest.fn();
  return {
    TruckPurchaseService: jest.fn().mockImplementation(() => ({
      purchaseTrucksWithPreselected: purchaseMock,
    })),
    getTrucksForSaleWithRetries: jest.fn(),
  };
});

jest.mock('../utils/truckPurchaseUtils', () => ({
  selectTrucksToBuy: jest.fn(),
  calculateTruckCosts: jest.fn()
}));

import { TimeManager } from '../services/timeManager';
import { BankAccountService } from '../services/bankAccountService';
import { TruckPurchaseService, getTrucksForSaleWithRetries } from '../services/truckPurchaseService';
import { selectTrucksToBuy, calculateTruckCosts } from '../utils/truckPurchaseUtils';

describe('SimulationResetService', () => {
  let mockQueryRunner: any;
  let mockRepoFactory: jest.Mock;
  let mockTMInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    (AppDataSource as any).isInitialized = false;
    (AppDataSource as any).initialize = jest.fn().mockResolvedValue(undefined);
    (AppDataSource as any).dropDatabase = jest.fn().mockResolvedValue(undefined);
    (AppDataSource as any).runMigrations = jest.fn().mockResolvedValue(undefined);

    // Query runner with transaction controls
    mockRepoFactory = jest.fn().mockReturnValue({ insert: jest.fn().mockResolvedValue(undefined) });
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: { getRepository: mockRepoFactory }
    };
    (AppDataSource as any).createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);

    // TimeManager singleton instance
    mockTMInstance = { reset: jest.fn() };
    (TimeManager.getInstance as jest.Mock).mockReturnValue(mockTMInstance);

    // Default BankAccountService behavior
    (BankAccountService as unknown as jest.Mock).mockImplementation(() => ({
      createBankAccount: jest.fn().mockResolvedValue({}),
      applyForLoanWithFallback: jest.fn().mockResolvedValue({ response: { success: true }, attemptedAmount: 0 })
    }));

    // Default TruckPurchaseService + helper behavior
    (TruckPurchaseService as unknown as jest.Mock).mockImplementation(() => ({
      purchaseTrucksWithPreselected: jest.fn().mockResolvedValue(undefined)
    }));
    (getTrucksForSaleWithRetries as jest.Mock).mockResolvedValue([]);

    (selectTrucksToBuy as jest.Mock).mockReset();
    (calculateTruckCosts as jest.Mock).mockReset();
  });

  describe('resetAndMigrateDatabase', () => {
    it('initializes connection when not initialized and runs reset/migrate/seed', async () => {
      // Arrange: defaults already set in beforeEach (not initialized)

      // Act
      await SimulationResetService.resetAndMigrateDatabase();

      // Assert
      expect((AppDataSource as any).initialize).toHaveBeenCalled();
      expect((AppDataSource as any).dropDatabase).toHaveBeenCalled();
      expect((AppDataSource as any).runMigrations).toHaveBeenCalled();

      // Core seeding performed within a transaction
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // TimeManager reset invoked at end
      expect(mockTMInstance.reset).toHaveBeenCalled();
    });

    it('skips initialize when already initialized', async () => {
      // Arrange
      (AppDataSource as any).isInitialized = true;

      // Act
      await SimulationResetService.resetAndMigrateDatabase();

      // Assert
      expect((AppDataSource as any).initialize).not.toHaveBeenCalled();
      expect((AppDataSource as any).dropDatabase).toHaveBeenCalled();
      expect((AppDataSource as any).runMigrations).toHaveBeenCalled();
      expect(mockTMInstance.reset).toHaveBeenCalled();
    });

    it('rolls back and rethrows if core seeding fails', async () => {
      // Arrange: make the first insert fail
      mockRepoFactory.mockReturnValueOnce({ insert: jest.fn().mockRejectedValue(new Error('seed error')) });

      // Act/Assert
      await expect(SimulationResetService.resetAndMigrateDatabase()).rejects.toThrow('seed error');

      // Transaction should roll back and release
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // On failure, TimeManager reset should not be called
      expect(mockTMInstance.reset).not.toHaveBeenCalled();
    });
  });

  describe('getTrucksForSaleWithResilience (private)', () => {
    it('returns trucks when external call provides data', async () => {
      // Arrange
      const trucks = [{ truckName: 'small_truck' }];
      (getTrucksForSaleWithRetries as jest.Mock).mockResolvedValueOnce(trucks);

      // Act
      const result = await (SimulationResetService as any).getTrucksForSaleWithResilience();

      // Assert
      expect(result).toEqual(trucks);
    });

    it('returns empty array when external call returns null', async () => {
      // Arrange
      (getTrucksForSaleWithRetries as jest.Mock).mockResolvedValueOnce(null);

      // Act
      const result = await (SimulationResetService as any).getTrucksForSaleWithResilience();

      // Assert
      expect(result).toEqual([]);
    });

    it('returns empty array when external call throws', async () => {
      // Arrange
      (getTrucksForSaleWithRetries as jest.Mock).mockRejectedValueOnce(new Error('network'));

      // Act
      const result = await (SimulationResetService as any).getTrucksForSaleWithResilience();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('calculateTruckRequirements (private)', () => {
    it('calculates using selected trucks and costs', () => {
      // Arrange
      const trucksToBuy = [
        { truckName: 'small_truck', quantityToBuy: 2, price: 1000, operatingCost: 50, maximumLoad: 1200 },
      ];
      (selectTrucksToBuy as jest.Mock).mockReturnValue(trucksToBuy);
      (calculateTruckCosts as jest.Mock).mockReturnValue({ totalPurchase: 5000, totalDailyOperating: 200 });

      // Act
      const { trucksToBuy: chosen, loanAmount } = (SimulationResetService as any).calculateTruckRequirements([{ id: 1 }]);

      // Assert
      expect(chosen).toEqual(trucksToBuy);
      expect(loanAmount).toBe((5000 + 14 * 200) *5);
    });

    it('uses fallback configuration when no trucks available', () => {
      // Arrange
      // No setup required; input is empty

      // Act
      const { trucksToBuy, loanAmount } = (SimulationResetService as any).calculateTruckRequirements([]);

      // Assert
      expect(trucksToBuy).toEqual([
        { truckName: 'Small Truck', quantityToBuy: 3, price: 10000, operatingCost: 500, maximumLoad: 2000 }
      ]);
      expect(loanAmount).toBe(51000);
    });
  });

  describe('applyForLoanWithResilience (private)', () => {
    it('invokes BankAccountService.applyForLoanWithFallback with provided amount', async () => {
      // Arrange
      const loanMock = jest.fn().mockResolvedValue({ response: { success: true }, attemptedAmount: 1234 });
      (BankAccountService as unknown as jest.Mock).mockImplementation(() => ({
        createBankAccount: jest.fn(),
        applyForLoanWithFallback: loanMock
      }));

      // Act
      await (SimulationResetService as any).applyForLoanWithResilience(1234);

      // Assert
      expect(loanMock).toHaveBeenCalledWith(1234);
    });

    it('handles errors from loan application gracefully', async () => {
      // Arrange
      (BankAccountService as unknown as jest.Mock).mockImplementation(() => ({
        createBankAccount: jest.fn(),
        applyForLoanWithFallback: jest.fn().mockRejectedValue(new Error('loan-fail'))
      }));

      // Act/Assert
      await expect((SimulationResetService as any).applyForLoanWithResilience(5000)).resolves.toBeUndefined();
    });
  });

  describe('purchaseTrucksWithResilience (private)', () => {
    it('calls TruckPurchaseService to purchase trucks', async () => {
      // Arrange
      const purchaseMock = jest.fn().mockResolvedValue(undefined);
      (TruckPurchaseService as unknown as jest.Mock).mockImplementation(() => ({
        purchaseTrucksWithPreselected: purchaseMock
      }));
      const trucks = [{ truckName: 'small_truck', quantityToBuy: 1, price: 1000, operatingCost: 50, maximumLoad: 1200 }];

      // Act
      await (SimulationResetService as any).purchaseTrucksWithResilience(trucks);

      // Assert
      expect(purchaseMock).toHaveBeenCalledWith(trucks);
    });

    it('rethrows on purchase failure to trigger fallback', async () => {
      // Arrange
      const purchaseMock = jest.fn().mockRejectedValue(new Error('purchase-fail'));
      (TruckPurchaseService as unknown as jest.Mock).mockImplementation(() => ({
        purchaseTrucksWithPreselected: purchaseMock
      }));
      const trucks = [{ truckName: 'small_truck', quantityToBuy: 1, price: 1000, operatingCost: 50, maximumLoad: 1200 }];

      // Act/Assert
      await expect((SimulationResetService as any).purchaseTrucksWithResilience(trucks)).rejects.toThrow('purchase-fail');
    });
  });

  describe('initializeTruckFleetWithFallbacks (private)', () => {
    it('falls back to minimal setup when purchase fails', async () => {
      // Arrange: No trucks available -> fallback config path
      (getTrucksForSaleWithRetries as jest.Mock).mockResolvedValueOnce([]);

      // Loan application succeeds
      (BankAccountService as unknown as jest.Mock).mockImplementation(() => ({
        createBankAccount: jest.fn(),
        applyForLoanWithFallback: jest.fn().mockResolvedValue({ response: { success: true }, attemptedAmount: 51000 })
      }));

      // First purchase attempt fails, second (minimal) succeeds
      const purchaseMock = jest
        .fn()
        .mockRejectedValueOnce(new Error('initial-purchase-fail'))
        .mockResolvedValueOnce(undefined);
      (TruckPurchaseService as unknown as jest.Mock).mockImplementation(() => ({
        purchaseTrucksWithPreselected: purchaseMock
      }));

      // Act
      await (SimulationResetService as any).initializeTruckFleetWithFallbacks();

      // Assert: second call is the minimal truck setup
      expect(purchaseMock).toHaveBeenCalledTimes(2);
      const secondArgs = purchaseMock.mock.calls[1][0];
      expect(secondArgs).toEqual([
        { truckName: 'Small Truck', quantityToBuy: 2, price: 8000, operatingCost: 400, maximumLoad: 1500 }
      ]);
    });
  });
});
