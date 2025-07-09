export interface TruckToBuy {
  truckName: string;
  price: number;
  operatingCost: number;
  quantityToBuy: number;
}

export function selectTrucksToBuy(trucksForSale: any[]): TruckToBuy[] {
  const smallTruck = trucksForSale.find(t => t.truckName.toLowerCase().includes('small'));

  const trucksToBuy: TruckToBuy[] = [];
  if (smallTruck) {
    trucksToBuy.push({ 
      truckName: smallTruck.truckName,
      price: smallTruck.price,
      operatingCost: smallTruck.operatingCost,
      quantityToBuy: 3 // <-- Only 3 small trucks initially
    });
  }
  return trucksToBuy;
}

export function calculateTruckCosts(trucksToBuy: TruckToBuy[]) {
  let totalPurchase = 0;
  let totalDailyOperating = 0;
  trucksToBuy.forEach(truck => {
    totalPurchase += truck.price * truck.quantityToBuy;
    totalDailyOperating += truck.operatingCost * truck.quantityToBuy;
  });
  return { totalPurchase, totalDailyOperating };
}