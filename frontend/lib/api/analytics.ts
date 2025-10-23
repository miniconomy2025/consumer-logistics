import { api } from './client';
import {
  DashboardAnalyticsResponse,
  KPIAnalyticsResponse,
  AnalyticsHealthResponse,
  AnalyticsQueryParams,
  AnalyticsDateRange,
} from '../types/analytics';
import { RecentOrdersResponse } from '../types/orders';

// ============================================================================
// MAIN ANALYTICS ENDPOINTS
// ============================================================================

/**
 * Get dashboard analytics - Main dashboard data
 */
export async function getDashboardAnalytics(params?: AnalyticsQueryParams): Promise<DashboardAnalyticsResponse> {
  return api.get<DashboardAnalyticsResponse>('/analytics/dashboard', params);
}

/**
 * Get KPI analytics - Key Performance Indicators
 */
export async function getKPIAnalytics(params?: AnalyticsQueryParams): Promise<KPIAnalyticsResponse> {
  return api.get<KPIAnalyticsResponse>('/analytics/kpis', params);
}

/**
 * Get analytics health check
 */
export async function getAnalyticsHealth(): Promise<AnalyticsHealthResponse> {
  return api.get<AnalyticsHealthResponse>('/analytics/health');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create analytics query params with range
 */
export function createAnalyticsParams(range: AnalyticsDateRange, additionalParams?: Partial<AnalyticsQueryParams>): AnalyticsQueryParams {
  return {
    range,
    ...additionalParams,
  };
}

/**
 * Analytics range options for UI components
 */
export const analyticsRangeOptions = [
  { value: 'last7days' as AnalyticsDateRange, label: 'Last 7 Days' },
  { value: 'last30days' as AnalyticsDateRange, label: 'Last 30 Days' },
  { value: 'currentyear' as AnalyticsDateRange, label: 'Current Year' },
  { value: 'alltime' as AnalyticsDateRange, label: 'All Time' },
] as const;

/**
 * Get recent orders feed
 */
export async function getRecentOrders(limit: number = 100): Promise<RecentOrdersResponse> {
  return api.get<RecentOrdersResponse>('/analytics/orders', { limit });
}
