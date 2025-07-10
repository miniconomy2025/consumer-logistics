export interface TruckToBuy {
  truckName: string;
  price: number;
  operatingCost: number;
  maximumLoad: number; 
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
      maximumLoad: smallTruck.maximumLoad,
      quantityToBuy: 3
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