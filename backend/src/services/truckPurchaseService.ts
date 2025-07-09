import { getTrucksForSale } from './truckMarketService';
import { selectTrucksToBuy, calculateTruckCosts } from '../utils/truckPurchaseUtils';
import { applyForLoanWithFallback } from './loanService';
import { TruckManagementService } from './truckManagementService';
import { TruckRepository } from '../repositories/implementations/TruckRepository';
import { AppDataSource } from '../database/config'; 
import { TruckEntity } from '../database/models/TruckEntity'; 
import { MARKET_API_URL } from '../config/apiConfig';

export class TruckPurchaseService {
  async purchaseTrucks(daysToCover: number = 14) {  // loan for 14 days operating costs by default
    const truckRepo = AppDataSource.getRepository(TruckEntity);
    const existingTrucks = await truckRepo.count();
    if (existingTrucks > 0) {
      console.log('[TruckPurchaseService] Trucks already exist. Skipping purchase and loan.');
      return;
    }

    const trucksForSale = await getTrucksForSale();
    const trucksToBuy = selectTrucksToBuy(trucksForSale);
    const { totalPurchase, totalDailyOperating } = calculateTruckCosts(trucksToBuy);
    const loanAmount = totalPurchase + (totalDailyOperating * daysToCover);

    console.log(`[TruckPurchaseService] Applying for loan. Amount: $${loanAmount}`);

    const { response: loanResult, attemptedAmount } = await applyForLoanWithFallback(loanAmount);
    if (!loanResult.success) throw new Error('Loan application failed, even after fallback.');

    if (attemptedAmount < loanAmount) {
      console.warn(`[TruckPurchaseService] Fallback loan used. Original: $${loanAmount}, Approved: $${attemptedAmount}`);
    }

    for (const truck of trucksToBuy) {
      // Order from the hand
      const orderResponse = await fetch(`${MARKET_API_URL}/trucks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckName: truck.truckName,
          quantity: truck.quantityToBuy
        })
      });
      if (!orderResponse.ok) throw new Error(`Order failed for ${truck.truckName}`);
      const orderData = await orderResponse.json();
      const orderId = orderData.orderId;

      // Pay for the order
      const paymentResponse = await fetch(`${MARKET_API_URL}/orders/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      if (!paymentResponse.ok) throw new Error(`Payment failed for order ${orderId}`);

      const truckManagementService = new TruckManagementService(new TruckRepository());
      const truckType = await truckManagementService.getTruckTypeByName(truck.truckName);
      if (!truckType) throw new Error(`Truck type not found: ${truck.truckName}`);
      for (let i = 0; i < truck.quantityToBuy; i++) {
        await truckManagementService.createTruck({
          truckTypeId: truckType.truck_type_id,
          maxPickups: 250, 
          maxDropoffs: 500, 
          dailyOperatingCost: truck.operatingCost,
          maxCapacity: 1000, // Set correct value
          isAvailable: true
        });
      }
    }
  }
}