import { AppDataSource } from '../database/config';
import { BankAccountEntity } from '../database/models/BankAccountEntity';

export async function getLogisticsAccountNumber(): Promise<string> {
    const repo = AppDataSource.getRepository(BankAccountEntity);
    const bankAccount = await repo.findOneBy({});
    return bankAccount?.account_number || process.env.DEFAULT_ACCOUNT_NUMBER || '0000000000';
}