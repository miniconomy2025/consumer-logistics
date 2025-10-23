import { FinanceController } from '../controllers/financeController';
import fetch from 'node-fetch';
import { logger } from '../utils/logger';

// --- Mock dependencies ---
jest.mock('node-fetch', () => jest.fn());
jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));
jest.mock('../agent', () => ({
  agent: {},
}));
jest.mock('../config/apiConfig', () => ({
  BANK_API_URL: 'https://fake-bank.com/api',
}));

describe('FinanceController', () => {
  let controller: FinanceController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    controller = new FinanceController();
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    mockFetch = fetch as jest.Mock;
    jest.clearAllMocks();
  });

  // --- getAccountSummary success ---
  it('should return 200 and account data when fetch succeeds', async () => {
    const mockData = { accountId: '12345', balance: 2000 };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockData),
    });

    await controller.getAccountSummary(mockReq, mockRes, mockNext);

    expect(mockFetch).toHaveBeenCalledWith('https://fake-bank.com/api/account/me', expect.any(Object));
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockData);
    expect(logger.error).not.toHaveBeenCalled();
  });

  // --- getAccountSummary failure (non-OK response) ---
  it('should log and return error response when fetch returns !ok', async () => {
    const mockError = { message: 'Unauthorized' };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue(mockError),
    });

    await controller.getAccountSummary(mockReq, mockRes, mockNext);

    expect(logger.error).toHaveBeenCalledWith('Bank account/me error', mockError);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Failed to fetch bank account',
      details: mockError,
    });
  });

  // --- getAccountSummary throws error ---
  it('should call next() when fetch throws', async () => {
    const thrownError = new Error('Network failure');
    mockFetch.mockRejectedValue(thrownError);

    await controller.getAccountSummary(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(thrownError);
  });

  // --- getLoanStatus success ---
  it('should return 200 and loan data when fetch succeeds', async () => {
    const mockData = { loanId: 'L-789', status: 'APPROVED' };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockData),
    });

    await controller.getLoanStatus(mockReq, mockRes, mockNext);

    expect(mockFetch).toHaveBeenCalledWith('https://fake-bank.com/api/loan', expect.any(Object));
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockData);
  });

  // --- getLoanStatus failure ---
  it('should handle API error and return failure response for getLoanStatus', async () => {
    const mockError = { error: 'Server down' };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockResolvedValue(mockError),
    });

    await controller.getLoanStatus(mockReq, mockRes, mockNext);

    expect(logger.error).toHaveBeenCalledWith('Bank loan status error', mockError);
    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Failed to fetch loan status',
      details: mockError,
    });
  });

  // --- getLoanStatus throws error ---
  it('should call next() when fetch throws in getLoanStatus', async () => {
    const err = new Error('Fetch crashed');
    mockFetch.mockRejectedValue(err);

    await controller.getLoanStatus(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(err);
  });
});
