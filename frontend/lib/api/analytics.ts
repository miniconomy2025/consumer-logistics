import { api } from './client';
import {
  DashboardAnalyticsResponse,
  KPIAnalyticsResponse,
  AnalyticsHealthResponse,
  AnalyticsQueryParams,
} from '../types/api';

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
 * Format analytics date range
 * Uses a fixed date to prevent hydration mismatches
 */
export function formatDateRange(days: number, baseDate?: Date): { dateFrom: string; dateTo: string } {
  // Use a fixed base date if not provided to prevent hydration issues
  const dateTo = baseDate || new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateTo.getDate() - days);

  return {
    dateFrom: dateFrom.toISOString().split('T')[0],
    dateTo: dateTo.toISOString().split('T')[0],
  };
}

/**
 * Get default analytics parameters for common periods
 * Uses client-side only execution to prevent hydration mismatches
 */
export const analyticsPresets = {
  last7Days: (baseDate?: Date) => formatDateRange(7, baseDate),
  last30Days: (baseDate?: Date) => formatDateRange(30, baseDate),
  last90Days: (baseDate?: Date) => formatDateRange(90, baseDate),
  lastYear: (baseDate?: Date) => formatDateRange(365, baseDate),
  currentMonth: (baseDate?: Date) => {
    const now = baseDate || new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      dateFrom: firstDay.toISOString().split('T')[0],
      dateTo: lastDay.toISOString().split('T')[0],
    };
  },
  currentYear: (baseDate?: Date) => {
    const now = baseDate || new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31);

    return {
      dateFrom: firstDay.toISOString().split('T')[0],
      dateTo: lastDay.toISOString().split('T')[0],
    };
  },
};
