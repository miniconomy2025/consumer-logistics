import fetch from 'node-fetch';
import { TRUCKS_API_URL } from '../config/apiConfig';

export interface TruckForSale {
  truckName: string;
  price: number;
  quantity: number;
  operatingCost: number;
  maximumLoad: number;
}

export async function getTrucksForSale(): Promise<TruckForSale[]> {
  const response = await fetch(`${TRUCKS_API_URL}/simulation/trucks`);
  if (!response.ok) {
    throw new Error(`Failed to fetch trucks: ${response.status} ${response.statusText}`);
  }
  return await response.json() as TruckForSale[];
}