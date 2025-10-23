import fetch from 'node-fetch';
import { BANK_API_URL, THOH_API_URL } from '../config/apiConfig';
import { selectTrucksToBuy, calculateTruckCosts, TruckToBuy } from '../utils/truckPurchaseUtils';
import { applyForLoanWithFallback } from './loanService';
import { TruckManagementService } from './truckManagementService';
import { TruckRepository } from '../repositories/implementations/TruckRepository';
import { AppDataSource } from '../database/config';
import { TruckEntity } from '../database/models/TruckEntity';
import { logger } from '../utils/logger';
import { agent } from '../agent';

export interface TruckForSale {
  truckName: string;
  price: number;
  quantity: number;
  operatingCost: number;
  maximumLoad: number;
}

export async function getTrucksForSale(): Promise<TruckForSale[]> {
  const response = await fetch(`${THOH_API_URL}/trucks`, {
    method: 'GET',
    headers: { 'Client-Id': 'consumer-logistics' },
    // @ts-ignore
    agent
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch trucks: ${response.status} ${response.statusText}`);
  }
  return await response.json() as TruckForSale[];
}

export async function getTrucksForSaleWithRetries(maxRetries: number = 3): Promise<TruckForSale[] | null> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      setTimeout(() => {}, 10000);
      const response = await fetch(`${THOH_API_URL}/trucks`, {
        method: 'GET',
        headers: { 'Client-Id': 'consumer-logistics' },
        // @ts-ignore
        agent
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch trucks: ${response.status} ${response.statusText}`);
      }
      return await response.json() as TruckForSale[];
    } catch (error) {
      lastError = error as Error;
      logger.error(`[getTrucksForSale] Attempt ${attempt} failed: ${lastError.message}`);
      if (attempt < maxRetries) {
        logger.info(`[getTrucksForSale] Retrying (attempt ${attempt + 1} of ${maxRetries})...`);
      }
    }
  }
  logger.warn('[getTrucksForSale] All attempts failed. Proceeding with default trucks.');
  return null;
}

export class TruckPurchaseService {
  async purchaseTrucksWithPreselected(trucksToBuy: TruckToBuy[]) {
    const truckRepo = AppDataSource.getRepository(TruckEntity);
    const existingTrucks = await truckRepo.count();
    if (existingTrucks > 0) {
      logger.info('[TruckPurchaseService] Trucks already exist. Skipping purchase.');
      return;
    }

    await this.orderAndRegisterTrucks(trucksToBuy);
  }

  private async orderAndRegisterTrucks(trucksToBuy: TruckToBuy[]) {
    const truckManagementService = new TruckManagementService(new TruckRepository());

    // Map to translate THOH truck names to our database truck type names
    const truckNameMap: Record<string, string> = {
      'small_truck': 'Small Truck',
      'medium_truck': 'Medium Truck',
      'large_truck': 'Large Truck'
    };

    for (const truck of trucksToBuy) {
      logger.info(`[TruckPurchaseService] Ordering ${truck.quantityToBuy} x ${truck.truckName}...`);
      const orderResponse = await fetch(`${THOH_API_URL}/trucks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' 
          ,'Client-Id': 'consumer-logistics'
        },
        agent: agent,
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
        totalPrice: number;
        maximumLoad: number;
        operatingCostPerDay: string;
        weight: number;
        totalWeight: number;
        quantity: number;
        bankAccount: string;
      };
      const { orderId, totalPrice, bankAccount, maximumLoad, operatingCostPerDay, quantity } = orderData;

      logger.info(`[TruckPurchaseService] Paying $${totalPrice} to bank account ${bankAccount} for order ${orderId}...`);
      logger.info(`[TruckPurchaseService] Payload: ${JSON.stringify({
        to_account_number: bankAccount === "TREASURY_ACCOUNT" ? "" : bankAccount,
        to_bank_name: 'commercial-bank',
        amount: totalPrice,
        description: orderId.toString(),
      })}`);
      const paymentResponse = await fetch(`${BANK_API_URL}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' 
          ,'Client-Id': 'consumer-logistics'
        },
        agent: agent,
        body: JSON.stringify({
          to_account_number: bankAccount === "TREASURY_ACCOUNT" ? "" : bankAccount,
          to_bank_name: 'thoh',
          amount: totalPrice,
          description: orderId.toString(),
        })
      });
      if (!paymentResponse.ok) {
        logger.error(`[TruckPurchaseService] Failed to pay for order: ${orderId}`);
        logger.error(`[TruckPurchaseService] Body: ${await paymentResponse.text()}`);
        continue;
      }

      try {
        const dbTruckTypeName = truckNameMap[truck.truckName];
        
        const truckType = await truckManagementService.getTruckTypeByName(dbTruckTypeName);
        
        if (!truckType) {
          throw new Error(`Truck type "${dbTruckTypeName}" not found in database. Please ensure it is seeded correctly.`);
        }
        
        const createdTrucks = await truckManagementService.createTruck({
          truckTypeId: truckType.truck_type_id,
          maxPickups: 250,
          maxDropoffs: 500,
          dailyOperatingCost: parseFloat(operatingCostPerDay),
          maxCapacity: maximumLoad,
          isAvailable: true,
          quantity: quantity
        });
        
        logger.info(`[TruckPurchaseService] Registered ${quantity} x ${dbTruckTypeName} (type ID: ${truckType.truck_type_id}) in database after payment.`);
      } catch (error) {
        logger.error(`[TruckPurchaseService] Failed to register trucks in database: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}