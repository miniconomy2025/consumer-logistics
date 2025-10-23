import request from 'supertest';
import fetch from 'node-fetch';
import { createTestApp } from './testApp';
import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';

jest.mock('node-fetch', () => jest.fn());
jest.mock('../utils/logger', () => ({
  logger: { error: jest.fn() },
}));

describe('FinanceController (Integration)', () => {
  const app = createTestApp();
  const mockFetch = fetch as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Successful account summary
  it('GET /api/account-summary returns 200 and account data', async () => {
    const mockData = { accountId: 'ACC-1', balance: 1500 };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockData),
    });

    const res = await request(app).get('/api/account-summary');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/account\/me$/),
      expect.any(Object)
    );
  });

  // Account summary error (non-OK)
  it('GET /api/account-summary returns error JSON when fetch fails', async () => {
    const mockError = { message: 'Unauthorized' };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue(mockError),
    });

    const res = await request(app).get('/api/account-summary');

    expect(logger.error).toHaveBeenCalledWith('Bank account/me error', mockError);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      message: 'Failed to fetch bank account',
      details: mockError,
    });
  });

  // Account summary throws exception
  it('GET /api/account-summary calls error handler when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network down'));

    // simulate error handler in Express
    const appWithErrorHandler = createTestApp();
    appWithErrorHandler.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({ message: err.message });
  });

    const res = await request(appWithErrorHandler).get('/api/account-summary');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Network down');
  });

  // Successful loan status
  it('GET /api/loan-status returns 200 and loan data', async () => {
    const mockData = { loanId: 'LN-55', status: 'APPROVED' };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockData),
    });

    const res = await request(app).get('/api/loan-status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/loan$/),
      expect.any(Object)
    );
  });

  // Loan status error
  it('GET /api/loan-status returns API error JSON', async () => {
    const mockError = { reason: 'Service unavailable' };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockResolvedValue(mockError),
    });

    const res = await request(app).get('/api/loan-status');

    expect(logger.error).toHaveBeenCalledWith('Bank loan status error', mockError);
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      message: 'Failed to fetch loan status',
      details: mockError,
    });
  });

  // Loan status exception
  it('GET /api/loan-status propagates error via Express error handler', async () => {
    mockFetch.mockRejectedValue(new Error('Unexpected failure'));

    const appWithErrorHandler = createTestApp();
    appWithErrorHandler.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({ message: err.message });
  });

    const res = await request(appWithErrorHandler).get('/api/loan-status');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Unexpected failure');
  });
});
