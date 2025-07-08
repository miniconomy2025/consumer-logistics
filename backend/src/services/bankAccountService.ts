import { AppDataSource } from '../database/config';
import { BankAccountEntity } from '../database/models/BankAccountEntity';
import { logger } from '../utils/logger';

export class BankAccountService {
  private bankAccountRepo = AppDataSource.getRepository(BankAccountEntity);
  private defaultAccountNumber = process.env.DEFAULT_ACCOUNT_NUMBER || '0000000000';

  async ensureBankAccount(): Promise<BankAccountEntity> {
    let bankAccount = await this.bankAccountRepo.findOneBy({});
    if (!bankAccount) {
      try {
        const response = await fetch('https://<bank-api-domain>/account', {   // Replace with actual API domain
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (!response.ok) {
          throw new Error(`Bank API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const accountNumber = data.account_number;
        logger.info(`Bank account created: ${accountNumber}`);

        bankAccount = this.bankAccountRepo.create({ account_number: accountNumber });
        await this.bankAccountRepo.save(bankAccount);
        logger.info('Bank account number saved to DB.');
      } catch (err) {
        logger.error('Failed to create or save bank account:', err);
        logger.warn(`Using default account number from .env: ${this.defaultAccountNumber}`);
        bankAccount = this.bankAccountRepo.create({ account_number: this.defaultAccountNumber });
        await this.bankAccountRepo.save(bankAccount);
      }
    } else {
      logger.info(`Bank account already exists in DB: ${bankAccount.account_number}`);
    }
    return bankAccount;
  }
}