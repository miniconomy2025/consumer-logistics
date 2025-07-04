// Pickup API Service Functions
// Backend pickup CRUD endpoints are now implemented and working

import { api } from './client';
import {
  PickupResponse,
  PickupsListResponse,
  CreatePickupRequest,
  UpdatePickupRequest,
  PickupSearchParams,
  PickupAnalyticsResponse,
  PickupStatusResponse,
} from '../types/api';

// ============================================================================
// PICKUP CRUD OPERATIONS
// ============================================================================

/**
 * Get all pickups
 */
export async function getPickups(params?: PickupSearchParams): Promise<PickupsListResponse> {
  return api.get<PickupsListResponse>('/pickups', params);
}

/**
 * Get pickup by ID
 */
export async function getPickupById(id: number): Promise<PickupResponse> {
  return api.get<PickupResponse>(`/pickups/${id}`);
}

/**
 * Create new pickup
 * This is the only pickup endpoint currently implemented in the backend
 */
export async function createPickup(data: CreatePickupRequest): Promise<PickupResponse> {
  // Backend expects: { pickupFrom: string, quantity: number, deliveryTo: string }
  // CreatePickupRequest now matches this structure exactly

  const backendData = {
    pickupFrom: data.pickupFrom,
    quantity: data.quantity,
    deliveryTo: data.deliveryTo,
  };

  return api.post<PickupResponse>('/pickups', backendData);
}

/**
 * Update pickup
 */
export async function updatePickup(id: number, data: UpdatePickupRequest): Promise<PickupResponse> {
  return api.put<PickupResponse>(`/pickups/${id}`, data);
}

/**
 * Delete pickup
 */
export async function deletePickup(id: number): Promise<void> {
  return api.delete<void>(`/pickups/${id}`);
}

// ============================================================================
// PICKUP ANALYTICS AND SEARCH
// ============================================================================

/**
 * Get pickup analytics
 */
export async function getPickupAnalytics(params?: {
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
}): Promise<PickupAnalyticsResponse> {
  return api.get<PickupAnalyticsResponse>('/pickups/analytics', params);
}

/**
 * Get recent pickups
 */
export async function getRecentPickups(limit: number = 10): Promise<PickupResponse[]> {
  return api.get<PickupResponse[]>('/pickups/recent', { limit });
}

/**
 * Search pickups
 */
export async function searchPickups(params: PickupSearchParams): Promise<PickupsListResponse> {
  return api.get<PickupsListResponse>('/pickups/search', params);
}

/**
 * Get pickup status options
 */
export async function getPickupStatus(): Promise<PickupStatusResponse[]> {
  return api.get<PickupStatusResponse[]>('/pickups/statuses');
}

// ============================================================================
// PICKUP SEARCH AND FILTERING
// ============================================================================

/**
 * Get pickups by company
 */
export async function getPickupsByCompany(
  companyId: number,
  params?: Omit<PickupSearchParams, 'companyId'>
): Promise<PickupsListResponse> {
  return searchPickups({ ...params, companyId });
}

/**
 * Get pickups by status
 */
export async function getPickupsByStatus(
  statusId: number,
  params?: Omit<PickupSearchParams, 'statusId'>
): Promise<PickupsListResponse> {
  return searchPickups({ ...params, statusId });
}

/**
 * Get pickups by date range
 */
export async function getPickupsByDateRange(
  dateFrom: string,
  dateTo: string,
  params?: Omit<PickupSearchParams, 'dateFrom' | 'dateTo'>
): Promise<PickupsListResponse> {
  return searchPickups({ ...params, dateFrom, dateTo });
}

// ============================================================================
// PICKUP ANALYTICS
// ============================================================================

/**
 * Get pickup trends
 */
export async function getPickupTrends(params?: {
  dateFrom?: string;
  dateTo?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}): Promise<{
  period: string;
  pickups: number;
  revenue: number;
  averageValue: number;
}[]> {
  return api.get('/pickups/trends', params);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate pickup total value
 */
export function calculatePickupValue(phoneUnits: number, unitPrice: number): number {
  return phoneUnits * unitPrice;
}

/**
 * Format pickup date for API
 */
export function formatPickupDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get pickups for dropdown/select components
 */
export async function getPickupsForSelect(): Promise<Array<{ value: number; label: string }>> {
  try {
    const pickups = await getPickups();
    return pickups.pickups.map(pickup => ({
      value: pickup.pickupId,
      label: `Pickup #${pickup.pickupId} - ${pickup.company?.companyName || 'Unknown Company'}`,
    }));
  } catch (error) {
    console.error('Error getting pickups for select:', error);
    return [];
  }
}

/**
 * Get pending pickups
 */
export async function getPendingPickups(): Promise<PickupResponse[]> {
  try {
    // Assuming status ID 1 is "Pending" - this should be configurable
    const result = await getPickupsByStatus(1);
    return result.pickups;
  } catch (error) {
    console.error('Error getting pending pickups:', error);
    return [];
  }
}

/**
 * Get completed pickups
 */
export async function getCompletedPickups(params?: {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<PickupResponse[]> {
  try {
    // Assuming status ID 2 is "Completed" - this should be configurable
    const result = await searchPickups({
      statusId: 2,
      ...params,
    });
    return result.pickups;
  } catch (error) {
    console.error('Error getting completed pickups:', error);
    return [];
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Create multiple pickups
 */
export async function createMultiplePickups(
  pickups: CreatePickupRequest[]
): Promise<PickupResponse[]> {
  const results: PickupResponse[] = [];
  
  for (const pickup of pickups) {
    try {
      const result = await createPickup(pickup);
      results.push(result);
    } catch (error) {
      console.error(`Error creating pickup:`, error);
      // Continue with other pickups
    }
  }
  
  return results;
}

/**
 * Update pickup status
 */
export async function updatePickupStatus(
  pickupId: number,
  statusId: number
): Promise<PickupResponse> {
  return updatePickup(pickupId, { pickupStatusId: statusId });
}


