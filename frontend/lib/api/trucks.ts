// Truck API Service Functions

import { api } from './client';
import {
  TruckResponse,
  TruckTypeResponse,
  TrucksListResponse,
  TruckTypesListResponse,
  CreateTruckRequest,
  UpdateTruckRequest,
  CreateTruckTypeRequest,
} from '../types/api';

// ============================================================================
// TRUCK CRUD OPERATIONS
// ============================================================================

/**
 * Get all trucks
 */
export async function getTrucks(): Promise<TrucksListResponse> {
  return api.get<TrucksListResponse>('/trucks');
}

/**
 * Get truck by ID
 */
export async function getTruckById(id: number): Promise<TruckResponse> {
  return api.get<TruckResponse>(`/trucks/${id}`);
}

/**
 * Create new truck
 */
export async function createTruck(data: CreateTruckRequest): Promise<TruckResponse> {
  return api.post<TruckResponse>('/trucks', data);
}

/**
 * Update truck
 */
export async function updateTruck(id: number, data: UpdateTruckRequest): Promise<TruckResponse> {
  return api.put<TruckResponse>(`/trucks/${id}`, data);
}

/**
 * Delete truck
 */
export async function deleteTruck(id: number): Promise<void> {
  return api.delete<void>(`/trucks/${id}`);
}

// ============================================================================
// TRUCK TYPE CRUD OPERATIONS
// ============================================================================

/**
 * Get all truck types
 */
export async function getTruckTypes(): Promise<TruckTypesListResponse> {
  return api.get<TruckTypesListResponse>('/trucks/types');
}

/**
 * Get truck type by ID
 */
export async function getTruckTypeById(id: number): Promise<TruckTypeResponse> {
  return api.get<TruckTypeResponse>(`/trucks/types/${id}`);
}

/**
 * Create new truck type
 */
export async function createTruckType(data: CreateTruckTypeRequest): Promise<TruckTypeResponse> {
  return api.post<TruckTypeResponse>('/trucks/types', data);
}

/**
 * Delete truck type
 */
export async function deleteTruckType(id: number): Promise<void> {
  return api.delete<void>(`/trucks/types/${id}`);
}

// ============================================================================
// TRUCK ANALYTICS AND UTILITIES
// ============================================================================

/**
 * Get trucks by type
 */
export async function getTrucksByType(typeId: number): Promise<TruckResponse[]> {
  try {
    const trucks = await getTrucks();
    return trucks.trucks.filter(truck => truck.truckTypeId === typeId);
  } catch (error) {
    console.error('Error getting trucks by type:', error);
    return [];
  }
}

/**
 * Get truck utilization data
 */
export async function getTruckUtilization(): Promise<{
  truckId: number;
  utilization: number;
  efficiency: number;
}[]> {
  // This would need to be implemented in the backend
  // For now, return mock calculation based on capacity
  try {
    const trucks = await getTrucks();
    return trucks.trucks.map(truck => ({
      truckId: truck.truckId,
      utilization: Math.random() * 100, // Mock data
      efficiency: (truck.maxCapacity / truck.dailyOperatingCost) * 100,
    }));
  } catch (error) {
    console.error('Error getting truck utilization:', error);
    return [];
  }
}

/**
 * Calculate truck efficiency (capacity per cost)
 */
export function calculateTruckEfficiency(truck: TruckResponse): number {
  return truck.maxCapacity / truck.dailyOperatingCost;
}

/**
 * Get most efficient trucks
 */
export async function getMostEfficientTrucks(limit: number = 5): Promise<TruckResponse[]> {
  try {
    const trucks = await getTrucks();
    return trucks.trucks
      .sort((a, b) => calculateTruckEfficiency(b) - calculateTruckEfficiency(a))
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting most efficient trucks:', error);
    return [];
  }
}

/**
 * Get trucks for dropdown/select components
 */
export async function getTrucksForSelect(): Promise<Array<{ value: number; label: string }>> {
  try {
    const trucks = await getTrucks();
    return trucks.trucks.map(truck => ({
      value: truck.truckId,
      label: `Truck #${truck.truckId} - ${truck.truckType.truckTypeName}`,
    }));
  } catch (error) {
    console.error('Error getting trucks for select:', error);
    return [];
  }
}

/**
 * Get truck types for dropdown/select components
 */
export async function getTruckTypesForSelect(): Promise<Array<{ value: number; label: string }>> {
  try {
    const truckTypes = await getTruckTypes();
    return truckTypes.truckTypes.map(type => ({
      value: type.truckTypeId,
      label: type.truckTypeName,
    }));
  } catch (error) {
    console.error('Error getting truck types for select:', error);
    return [];
  }
}

// ============================================================================
// FLEET ANALYTICS
// ============================================================================

/**
 * Get fleet summary
 */
export async function getFleetSummary(): Promise<{
  totalTrucks: number;
  totalCapacity: number;
  totalDailyCost: number;
  averageCapacity: number;
  averageDailyCost: number;
  typeDistribution: { typeName: string; count: number }[];
}> {
  try {
    const trucks = await getTrucks();
    const truckList = trucks.trucks;
    
    const totalTrucks = truckList.length;
    const totalCapacity = truckList.reduce((sum, truck) => sum + truck.maxCapacity, 0);
    const totalDailyCost = truckList.reduce((sum, truck) => sum + truck.dailyOperatingCost, 0);
    
    // Calculate type distribution
    const typeCount: Record<string, number> = {};
    truckList.forEach(truck => {
      const typeName = truck.truckType.truckTypeName;
      typeCount[typeName] = (typeCount[typeName] || 0) + 1;
    });
    
    const typeDistribution = Object.entries(typeCount).map(([typeName, count]) => ({
      typeName,
      count,
    }));
    
    return {
      totalTrucks,
      totalCapacity,
      totalDailyCost,
      averageCapacity: totalCapacity / totalTrucks || 0,
      averageDailyCost: totalDailyCost / totalTrucks || 0,
      typeDistribution,
    };
  } catch (error) {
    console.error('Error getting fleet summary:', error);
    return {
      totalTrucks: 0,
      totalCapacity: 0,
      totalDailyCost: 0,
      averageCapacity: 0,
      averageDailyCost: 0,
      typeDistribution: [],
    };
  }
}

/**
 * Check if truck type name is available
 */
export async function checkTruckTypeNameAvailability(name: string): Promise<boolean> {
  try {
    const truckTypes = await getTruckTypes();
    return !truckTypes.truckTypes.some(
      type => type.truckTypeName.toLowerCase() === name.toLowerCase()
    );
  } catch (error) {
    console.error('Error checking truck type name availability:', error);
    return false;
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Create multiple trucks
 */
export async function createMultipleTrucks(
  trucks: CreateTruckRequest[]
): Promise<TruckResponse[]> {
  const results: TruckResponse[] = [];
  
  for (const truck of trucks) {
    try {
      const result = await createTruck(truck);
      results.push(result);
    } catch (error) {
      console.error(`Error creating truck:`, error);
      // Continue with other trucks
    }
  }
  
  return results;
}
