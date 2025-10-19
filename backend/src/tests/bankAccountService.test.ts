import { BankAccountService } from '../services/bankAccountService';
import { AppDataSource } from '../database/config';
import * as loanService from '../services/loanService';

jest.mock('../database/config');
jest.mock('../database/models/BankAccountEntity');
jest.mock('../services/loanService');
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

  it('succeeds on the third attempt after two failures', async () => {
    fetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Another error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ account_number: '999' })
      });
    mockRepo.create.mockReturnValue({ account_number: '999' });
    mockRepo.save.mockResolvedValue({ account_number: '999' });

    const result = await service.createBankAccount();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.account_number).toBe('999');
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

  it('throws if saving to DB fails', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ account_number: '1234' })
    });
    mockRepo.create.mockReturnValue({ account_number: '1234' });
    mockRepo.save.mockRejectedValue(new Error('DB error'));
    await expect(service.createBankAccount()).rejects.toThrow('DB error');
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

  it('throws if API response does not include account_number', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
    await expect(service.createBankAccount()).rejects.toThrow();
  });


  it('computes correct loan amount and calls applyForLoanWithFallback', async () => {
    const mockResponse = { response: { success: true }, attemptedAmount: 1000 };
    (loanService.applyForLoanWithFallback as jest.Mock).mockResolvedValue(mockResponse);

    const result = await service.requestTruckPurchaseLoan(5000, 100, 10);

    expect(loanService.applyForLoanWithFallback).toHaveBeenCalledWith(6000);
    expect(result.requestedAmount).toBe(6000);
    expect(result.response).toEqual(mockResponse.response);
  });

});