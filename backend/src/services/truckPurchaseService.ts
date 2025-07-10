import fetch from 'node-fetch';
import { BANK_API_URL, THOH_API_URL } from '../config/apiConfig';
import { selectTrucksToBuy, calculateTruckCosts, TruckToBuy } from '../utils/truckPurchaseUtils';
import { applyForLoanWithFallback } from './loanService';
import { TruckManagementService } from './truckManagementService';
import { TruckRepository } from '../repositories/implementations/TruckRepository';
import { AppDataSource } from '../database/config';
import { TruckEntity } from '../database/models/TruckEntity';
import { logger } from '../utils/logger';
import { BankAccountService } from './bankAccountService';

export interface TruckForSale {
  truckName: string;
  price: number;
  quantity: number;
  operatingCost: number;
  maximumLoad: number;
}

export async function getTrucksForSale(): Promise<TruckForSale[]> {
  const response = await fetch(`${THOH_API_URL}/trucks`);
  if (!response.ok) {
    throw new Error(`Failed to fetch trucks: ${response.status} ${response.statusText}`);
  }
  return await response.json() as TruckForSale[];
}

export class TruckPurchaseService {
  async purchaseTrucks(daysToCover: number = 14) {
    const truckRepo = AppDataSource.getRepository(TruckEntity);
    const existingTrucks = await truckRepo.count();
    if (existingTrucks > 0) {
      logger.info('[TruckPurchaseService] Trucks already exist. Skipping purchase and loan.');
      return;
    }

    logger.info('[TruckPurchaseService] Fetching trucks for sale...');
    const trucksForSale = await getTrucksForSale();
    const trucksToBuy = selectTrucksToBuy(trucksForSale);

    if (trucksToBuy.length === 0) {
      logger.warn('[TruckPurchaseService] No trucks selected for purchase.');
      return;
    }

    const { totalPurchase, totalDailyOperating } = calculateTruckCosts(trucksToBuy);
    const loanAmount = totalPurchase + (totalDailyOperating * daysToCover);

    logger.info(`[TruckPurchaseService] Applying for loan. Amount: $${loanAmount}`);
    const { response: loanResult, attemptedAmount } = await applyForLoanWithFallback(loanAmount);

    if (!loanResult.success) {
      logger.error('[TruckPurchaseService] Loan application failed, even after fallback.');
      throw new Error('Loan application failed, even after fallback.');
    }

    if (attemptedAmount < loanAmount) {
      logger.warn(`[TruckPurchaseService] Fallback loan used. Original: $${loanAmount}, Approved: $${attemptedAmount}`);
    }

    await this.orderAndRegisterTrucks(trucksToBuy);
  }

  private async orderAndRegisterTrucks(trucksToBuy: TruckToBuy[]) {
    const truckManagementService = new TruckManagementService(new TruckRepository());

    for (const truck of trucksToBuy) {
      logger.info(`[TruckPurchaseService] Ordering ${truck.quantityToBuy} x ${truck.truckName}...`);
      const orderResponse = await fetch(`${THOH_API_URL}/trucks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckName: truck.truckName,
          quantity: truck.quantityToBuy
        })
      });
      if (!orderResponse.ok) {
        logger.error(`[TruckPurchaseService] Failed to order truck: ${truck.truckName}`);
        continue;
      }
      const orderData = await orderResponse.json() as {
        orderId: number;
        truckName: string;
        price: number;
        maximumLoad: number;
        operatingCostPerDay: string;
        weight: number;
        totalWeight: number;
        quantity: number;
        bankAccount: string;
      };
      const { orderId, price, quantity, bankAccount } = orderData;

      logger.info(`[TruckPurchaseService] Paying $${price * quantity} to bank account ${bankAccount} for order ${orderId}...`);
      const paymentResponse = await fetch(`${BANK_API_URL}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_account_number: bankAccount,
          to_bank_name: 'commercial-bank',
          amount: price * quantity,
          description: orderId.toString(),
        })
      });
      if (!paymentResponse.ok) {
        logger.error(`[TruckPurchaseService] Failed to pay for order: ${orderId}`);
        continue;
      }
    }
  }

  async purchaseTrucksWithPreselected(trucksToBuy: TruckToBuy[]) {
    const truckRepo = AppDataSource.getRepository(TruckEntity);
    const existingTrucks = await truckRepo.count();
    if (existingTrucks > 0) {
      logger.info('[TruckPurchaseService] Trucks already exist. Skipping purchase.');
      return;
    }

    await this.orderAndRegisterTrucks(trucksToBuy);
  }

  async purchaseTrucksFullFlow(daysToCover: number = 14) {
    const trucksForSale = await getTrucksForSale();
    const trucksToBuy = selectTrucksToBuy(trucksForSale);
    if (trucksToBuy.length === 0) {
      logger.warn('[Startup] No trucks selected for purchase.');
      return;
    }
    const { totalPurchase, totalDailyOperating } = calculateTruckCosts(trucksToBuy);
    const loanAmount = totalPurchase + (totalDailyOperating * daysToCover);

    const bankAccountService = new BankAccountService();
    await bankAccountService.createBankAccount();

    const { response: loanResult, attemptedAmount } = await applyForLoanWithFallback(loanAmount);
    if (!loanResult.success) {
      logger.error('[Startup] Loan application failed, even after fallback.');
      throw new Error('Loan application failed, even after fallback.');
    }
    if (attemptedAmount < loanAmount) {
      logger.warn(`[Startup] Fallback loan used. Original: $${loanAmount}, Approved: $${attemptedAmount}`);
    }

    await this.purchaseTrucksWithPreselected(trucksToBuy);
  }
}