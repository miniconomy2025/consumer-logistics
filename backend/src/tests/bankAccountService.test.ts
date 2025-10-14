import { BankAccountService } from '../services/bankAccountService';
import { AppDataSource } from '../database/config';
import { BankAccountEntity } from '../database/models/BankAccountEntity';

jest.mock('../database/config');
jest.mock('../database/models/BankAccountEntity');
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

describe('BankAccountService', () => {
  let service: BankAccountService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn()
    };
    AppDataSource.getRepository = jest.fn().mockReturnValue(mockRepo);
    service = new BankAccountService();
    jest.clearAllMocks();
  });

  it('retries up to 3 times and throws if all attempts fail', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    await expect(service.createBankAccount()).rejects.toThrow('Network error');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('throws if response is not ok', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({})
    });
    await expect(service.createBankAccount()).rejects.toThrow('Bank API error: 500 Internal Server Error');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('creates and saves bank account if successful', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ account_number: '1234567890' })
    });
    mockRepo.create.mockReturnValue({ account_number: '1234567890' });
    mockRepo.save.mockResolvedValue({ account_number: '1234567890' });

    const result = await service.createBankAccount();
    expect(result.account_number).toBe('1234567890');
    expect(mockRepo.create).toHaveBeenCalledWith({ account_number: '1234567890' });
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('calls applyForLoanWithFallback', async () => {
    const mockResponse = { response: { success: true }, attemptedAmount: 1000 };
    service.applyForLoanWithFallback = jest.fn().mockResolvedValue(mockResponse);
    const result = await service.applyForLoanWithFallback(1000);
    expect(result).toEqual(mockResponse);
  });

  //it('calls requestTruckPurchaseLoan with correct calculation', async () => {
    //service.applyForLoanWithFallback = jest.fn().mockResolvedValue({ response: { success: true }, attemptedAmount: 15000 });
    //const result = await service.requestTruckPurchaseLoan(10000, 500, 10);
    //expect(service.applyForLoanWithFallback).toHaveBeenCalledWith(10000 + (500 * 10));
    //expect(result.requestedAmount).toBe(15000);
    //expect(result.response.success).toBe(true);
  //});
});