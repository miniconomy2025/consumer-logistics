import { applyForLoan, applyForLoanWithFallback } from '../services/loanService';

jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

describe('loanService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyForLoan', () => {
    it('returns LoanResponse on success', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, loan_number: 'LN123' })
      });
      const result = await applyForLoan(5000);
      expect(result.success).toBe(true);
      expect(result.loan_number).toBe('LN123');
      expect(fetch).toHaveBeenCalled();
    });

    it('throws error if response not ok', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({})
      });
      await expect(applyForLoan(5000)).rejects.toThrow('Bank loan API error: 400 Bad Request');
    });

    it('throws error if fetch fails', async () => {
      fetch.mockRejectedValue(new Error('Network error'));
      await expect(applyForLoan(5000)).rejects.toThrow('Network error');
    });
  });

  describe('applyForLoanWithFallback', () => {
    it('returns response and amount if first attempt succeeds', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, loan_number: 'LN123' })
      });
      const result = await applyForLoanWithFallback(5000);
      expect(result.response.success).toBe(true);
      expect(result.attemptedAmount).toBe(5000);
    });

    it('tries fallback amount if first attempt fails', async () => {
      // First call: fail, second call: succeed
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, loan_number: 'LN999' })
        });
      const result = await applyForLoanWithFallback(5000, 1000, 0.8);
      expect(result.response.success).toBe(true);
      expect(result.attemptedAmount).toBe(4000); // 5000 * 0.8
    });

    it('returns original response if fallback amount is not less than original', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false })
      });
      const result = await applyForLoanWithFallback(1000, 1000, 0.8);
      expect(result.response.success).toBe(false);
      expect(result.attemptedAmount).toBe(1000);
    });
  });
});