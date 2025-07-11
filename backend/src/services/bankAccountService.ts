import { AppDataSource } from '../database/config';
import { BankAccountEntity } from '../database/models/BankAccountEntity';
import { logger } from '../utils/logger';
import { BANK_API_URL } from '../config/apiConfig';

export class BankAccountService {
  private bankAccountRepo = AppDataSource.getRepository(BankAccountEntity);

  async createBankAccount(): Promise<BankAccountEntity> {
    const response = await fetch(`${BANK_API_URL}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationUrl: `https://consumer-logistics-api.projects.bbdgrad.com/api/webhook/payment-updates`
      })
    });
    if (!response.ok) {
      logger.error(`Bank API error: ${response.status} ${response.statusText}`);
      throw new Error(`Bank API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const accountNumber = data.account_number;
    logger.info(`Bank account created: ${accountNumber}`);

    const bankAccount = this.bankAccountRepo.create({ account_number: accountNumber });
    await this.bankAccountRepo.save(bankAccount);
    logger.info('Bank account number saved to DB.');
    return bankAccount;
  }
}