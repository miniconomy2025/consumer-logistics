import { PickupService } from '../services/pickupService';
import { PickupStatusEnum } from '../database/models/PickupEntity';
import { AppError } from '../shared/errors/ApplicationError';
import { getLogisticsAccountNumber } from '../utils/bankAccountUtils';

jest.mock('../utils/bankAccountUtils', () => ({
  getLogisticsAccountNumber: jest.fn().mockResolvedValue('1234567890')
}));

const mockPickupRepo = {
  getPickupStatusId: jest.fn(),
  createInvoice: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByInvoiceReference: jest.fn(),
  findByCompanyAndStatus: jest.fn(),
  updateInvoiceStatus: jest.fn(),
  update: jest.fn(),
};

const mockCompanyRepo = {
  findByName: jest.fn(),
  create: jest.fn(),
};

const mockTimeManager = {
  getCurrentTime: jest.fn(),
};

describe('PickupService (Critical Tests)', () => {
  let service: PickupService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PickupService(
      mockPickupRepo as any,
      mockCompanyRepo as any,
      mockTimeManager as any
    );
  });

  // Create pickup - success
  it('creates pickup and invoice successfully', async () => {
    const now = new Date('2025-10-23T10:00:00Z');
    mockTimeManager.getCurrentTime.mockReturnValue(now);
    mockCompanyRepo.findByName.mockResolvedValue({ company_id: 1, company_name: 'TestCo' });
    mockPickupRepo.getPickupStatusId.mockResolvedValue(1);
    mockPickupRepo.createInvoice.mockResolvedValue({ invoice_id: 1, reference_number: 'INV123' });
    mockPickupRepo.create.mockResolvedValue({ pickup_id: 10, model_name: 'ModelX' });

    const result = await service.createPickupRequest({
      companyName: 'TestCo',
      quantity: 5,
      modelName: 'ModelX',
      recipient: 'Lindiwe'
    });

    expect(result).toEqual({
      referenceNo: 'INV123',
      amount: (5 * 50).toFixed(2),
      accountNumber: '1234567890',
    });
    expect(mockPickupRepo.createInvoice).toHaveBeenCalled();
    expect(mockPickupRepo.create).toHaveBeenCalled();
  });

  // Create pickup - fails when invoice creation fails
  it('throws if invoice creation fails', async () => {
    mockCompanyRepo.findByName.mockResolvedValue({ company_id: 1 });
    mockPickupRepo.getPickupStatusId.mockResolvedValue(1);
    mockPickupRepo.createInvoice.mockResolvedValue(null);

    await expect(
      service.createPickupRequest({ companyName: 'TestCo', quantity: 1, modelName: 'ModelY', recipient: 'User' })
    ).rejects.toThrow(AppError);
  });

  // Mark pickup and invoice as paid - success
  it('marks pickup and invoice as paid successfully', async () => {
    mockPickupRepo.findByInvoiceReference.mockResolvedValue({
      pickup_id: 1,
      invoice: { invoice_id: 10, paid: false, reference_number: 'INV123' },
    });
    mockPickupRepo.getPickupStatusId.mockResolvedValue(2);
    mockPickupRepo.updateInvoiceStatus.mockResolvedValue(true);
    mockPickupRepo.update.mockResolvedValue({ pickup_id: 1, pickup_status_id: 2 });

    const result = await service.markPickupAndInvoiceAsPaid('INV123');

    expect(result).toEqual({ pickup_id: 1, pickup_status_id: 2 });
    expect(mockPickupRepo.updateInvoiceStatus).toHaveBeenCalledWith(10, true);
    expect(mockPickupRepo.update).toHaveBeenCalled();
  });

  // Mark pickup and invoice as paid - fails when pickup not found
  it('throws if pickup not found when marking as paid', async () => {
    mockPickupRepo.findByInvoiceReference.mockResolvedValue(null);

    await expect(service.markPickupAndInvoiceAsPaid('INV999')).rejects.toThrow(AppError);
  });
});
