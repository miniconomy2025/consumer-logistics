import { getTrucksForSale } from './truckMarketService';
import { selectTrucksToBuy, calculateTruckCosts } from '../utils/truckPurchaseUtils';
import { applyForLoan } from './loanService';
import { TruckManagementService } from './truckManagementService';
import { TruckRepository } from '../repositories/implementations/TruckRepository';
import { logger } from '../utils/logger';

export class TruckPurchaseService {
  async purchaseTrucks(daysToCover: number = 7) {
    const trucksForSale = await getTrucksForSale();
    const trucksToBuy = selectTrucksToBuy(trucksForSale);
    const { totalPurchase, totalDailyOperating } = calculateTruckCosts(trucksToBuy);
    const loanAmount = totalPurchase + (totalDailyOperating * daysToCover);

    const loanResult = await applyForLoan(loanAmount);
    if (!loanResult.success) throw new Error('Loan application failed');

    for (const truck of trucksToBuy) {
      // Order from market
      const orderResponse = await fetch('https://<market-api-domain>/trucks', {
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
      const paymentResponse = await fetch('https://<market-api-domain>/orders/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      if (!paymentResponse.ok) throw new Error(`Payment failed for order ${orderId}`);

      // Persist in DB using existing service
      const truckManagementService = new TruckManagementService(new TruckRepository());
      const truckType = await truckManagementService.getTruckTypeByName(truck.truckName);
      if (!truckType) throw new Error(`Truck type not found: ${truck.truckName}`);
      for (let i = 0; i < truck.quantityToBuy; i++) {
        await truckManagementService.createTruck({
          truckTypeId: truckType.truck_type_id,
          maxPickups: 3, // Set correct value
          maxDropoffs: 3, // Set correct value
          dailyOperatingCost: truck.operatingCost,
          maxCapacity: 1000, // Set correct value
          isAvailable: true
        });
      }
    }
  }
}