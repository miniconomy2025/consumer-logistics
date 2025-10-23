import { FinancialNotificationService, PaymentNotification } from '../services/financialNotificationService';
import { PickupService } from '../services/pickupService';
import { LogisticsPlanningService } from '../services/logisticsPlanningService';
import { TimeManager } from '../services/timeManager';
import { AppError } from '../shared/errors/ApplicationError';
import { PickupStatusEnum } from '../database/models/PickupEntity';

// ----------------------------
// Mock TruckManagementService module
// ----------------------------
jest.mock('../services/truckManagementService', () => {
  return {
    TruckManagementService: jest.fn().mockImplementation(() => ({
      getTruckTypeByName: jest.fn().mockResolvedValue({ truck_type_id: 1 }),
      createTruck: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('FinancialNotificationService - critical tests', () => {
  let service: FinancialNotificationService;
  let pickupServiceMock: jest.Mocked<PickupService>;
  let logisticsServiceMock: jest.Mocked<LogisticsPlanningService>;
  let timeManagerMock: jest.Mocked<TimeManager>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    pickupServiceMock = {
      getPickupByInvoiceReference: jest.fn(),
      markPickupAndInvoiceAsPaid: jest.fn(),
      updatePickupStatus: jest.fn(),
    } as unknown as jest.Mocked<PickupService>;

    logisticsServiceMock = {
      planNewCollectionAfterPayment: jest.fn(),
    } as unknown as jest.Mocked<LogisticsPlanningService>;

    timeManagerMock = {
      getCurrentTime: jest.fn(),
    } as unknown as jest.Mocked<TimeManager>;

    service = new FinancialNotificationService(pickupServiceMock, logisticsServiceMock, timeManagerMock);
  });

  // ---------------------------
  // Payment notification tests
  // ---------------------------
  it('throws if description is missing', async () => {
    const notification: PaymentNotification = {
      status: 'SUCCESS',
      amount: 100,
      transaction_number: '123',
      timestamp: '2025-10-23T00:00:00Z',
    };

    await expect(service.processPaymentNotification(notification)).rejects.toThrow(AppError);
  });

  it('throws if no pickup/invoice found', async () => {
    pickupServiceMock.getPickupByInvoiceReference.mockResolvedValue(null);

    const notification: PaymentNotification = {
      status: 'SUCCESS',
      amount: 100,
      transaction_number: '123',
      timestamp: '2025-10-23T00:00:00Z',
      description: 'INV-001',
    };

    await expect(service.processPaymentNotification(notification)).rejects.toThrow(AppError);
  });

  it('throws on insufficient payment', async () => {
    pickupServiceMock.getPickupByInvoiceReference.mockResolvedValue({
      pickup_id: 1,
      invoice: { total_amount: 200 },
      phone_units: 5,
    } as any);

    const notification: PaymentNotification = {
      status: 'SUCCESS',
      amount: 100,
      transaction_number: '123',
      timestamp: '2025-10-23T00:00:00Z',
      description: 'INV-001',
    };

    await expect(service.processPaymentNotification(notification)).rejects.toThrow('Insufficient payment received.');
  });

  it('processes payment and triggers logistics planning', async () => {
    const now = new Date('2025-10-23T10:30:00Z');
    timeManagerMock.getCurrentTime.mockReturnValue(now);

    pickupServiceMock.getPickupByInvoiceReference.mockResolvedValue({
      pickup_id: 1,
      invoice: { total_amount: 100 },
      phone_units: 5,
    } as any);

    pickupServiceMock.markPickupAndInvoiceAsPaid.mockResolvedValue({
      pickup_id: 1,
      phone_units: 5,
    } as any);

    const notification: PaymentNotification = {
      status: 'SUCCESS',
      amount: 100,
      transaction_number: '123',
      timestamp: now.toISOString(),
      description: 'INV-001',
    };

    await expect(service.processPaymentNotification(notification)).resolves.toBeUndefined();
    expect(logisticsServiceMock.planNewCollectionAfterPayment).toHaveBeenCalled();
  });

  // ---------------------------
  // Truck fulfillment tests
  // ---------------------------
  it('throws if canFulfill is true but required truck fields are missing', async () => {
    const notification: PaymentNotification = {
      status: 'SUCCESS',
      amount: 0,
      transaction_number: '123',
      timestamp: '2025-10-23T00:00:00Z',
      canFulfill: true,
    };

    await expect(service.processPaymentNotification(notification)).rejects.toThrow(AppError);
  });

});
