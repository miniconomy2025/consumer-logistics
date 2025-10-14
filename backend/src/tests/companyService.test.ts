import { CompanyService } from '../services/companyService';
import { AppError } from '../shared/errors/ApplicationError';

const mockRepo = {
  findByName: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
};

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompanyService(mockRepo as any);
  });

  it('registers a new company', async () => {
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ company_id: 1, company_name: 'TestCo' });
    const result = await service.registerCompany('TestCo');
    expect(result.company_name).toBe('TestCo');
    expect(mockRepo.create).toHaveBeenCalledWith('TestCo', undefined);
  });

  it('throws if company already exists', async () => {
    mockRepo.findByName.mockResolvedValue({ company_id: 1, company_name: 'TestCo' });
    await expect(service.registerCompany('TestCo')).rejects.toThrow(AppError);
  });

  it('gets company by ID', async () => {
    mockRepo.findById.mockResolvedValue({ company_id: 2, company_name: 'OtherCo' });
    const result = await service.getCompanyById(2);
    expect(result).not.toBeNull();
    expect(result!.company_name).toBe('OtherCo');
  });

  it('gets company by name', async () => {
    mockRepo.findByName.mockResolvedValue({ company_id: 3, company_name: 'ThirdCo' });
    const result = await service.getCompanyByName('ThirdCo');
    expect(result).not.toBeNull();
    expect(result!.company_id).toBe(3);
  });

  it('gets all companies', async () => {
    mockRepo.findAll.mockResolvedValue([{ company_id: 1 }, { company_id: 2 }]);
    const result = await service.getAllCompanies();
    expect(result.length).toBe(2);
  });

  it('updates company bank account', async () => {
    mockRepo.update.mockResolvedValue({ company_id: 1, bank_account_id: 'abc123' });
    const result = await service.updateCompanyBankAccount(1, 'abc123');
    expect(result.bank_account_id).toBe('abc123');
    expect(mockRepo.update).toHaveBeenCalledWith(1, { bank_account_id: 'abc123' });
  });

  it('throws if company not found for bank account update', async () => {
    mockRepo.update.mockResolvedValue(null);
    await expect(service.updateCompanyBankAccount(99, 'nope')).rejects.toThrow(AppError);
  });
});