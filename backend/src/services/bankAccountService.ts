import { AppDataSource } from '../database/config';
import { BankAccountEntity } from '../database/models/BankAccountEntity';
import { logger } from '../utils/logger';
import { BANK_API_URL } from '../config/apiConfig';
import { agent } from '../agent';
import { applyForLoanWithFallback, LoanResponse } from './loanService';
import fetch from 'node-fetch';

export class BankAccountService {
  private bankAccountRepo = AppDataSource.getRepository(BankAccountEntity);

  async createBankAccount(): Promise<BankAccountEntity> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${BANK_API_URL}/account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' 
            ,'Client-Id': 'consumer-logistics'
          },
          //agent: agent,
          body: JSON.stringify({
            notification_url: `https://consumer-logistics-api.projects.bbdgrad.com/api/webhook/payment-updates`
          })
        });
        if (!response.ok) {
          throw new Error(`Bank API error: ${response.status} ${response.statusText}`);
        }

        const data: any = await response.json();
        const accountNumber = data.account_number;

        if (!accountNumber) {
          throw new Error('Bank API response missing account_number');
        }

        logger.info(`Bank account created: ${accountNumber}`);

        const bankAccount = this.bankAccountRepo.create({ account_number: accountNumber });
        await this.bankAccountRepo.save(bankAccount);
        logger.info('Bank account number saved to DB.');
        return bankAccount;
      } catch (error) {
        lastError = error as Error;
        logger.error(`Attempt ${attempt} to create bank account failed: ${lastError.message}`);
        if (attempt < maxRetries) {
          logger.info(`Retrying bank account creation (attempt ${attempt + 1} of ${maxRetries})...`);
        }
      }
    }

    throw lastError ?? new Error('Failed to create bank account after retries.');
  }

  async applyForLoanWithFallback(amount: number): Promise<{ response: LoanResponse; attemptedAmount: number }> {
    return await applyForLoanWithFallback(amount);
  }

  async requestTruckPurchaseLoan(totalPurchase: number, totalDailyOperating: number, daysToCover: number = 14) {
    const loanAmount = totalPurchase + (totalDailyOperating * daysToCover);
    const { response, attemptedAmount } = await applyForLoanWithFallback(loanAmount);
    return { response, attemptedAmount, requestedAmount: loanAmount };
  }
}