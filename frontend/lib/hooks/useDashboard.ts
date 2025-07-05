// Dashboard-specific React Hooks

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useApi } from './useApi';
import {
  getDashboardKPIs,
  getAnalyticsSummary,
  getFleetAnalytics,
  getRevenueTrends,
  getPickupTrends,
  analyticsPresets,
} from '../api/analytics';

// Import enhanced analytics hooks
import {
  useDashboardAnalytics as useEnhancedDashboardAnalytics,
  useKPIAnalytics as useEnhancedKPIAnalytics,
  useTrendAnalytics as useEnhancedTrendAnalytics,
  useCombinedAnalytics as useEnhancedCombinedAnalytics,
  useAnalyticsHealth as useEnhancedAnalyticsHealth,
  useAnalyticsExport,
  useAnalyticsDateRange,
  useAnalyticsRefresh,
  useAnalyticsAggregation,
} from './useAnalytics';
import {
  getCompanies,
  getTopPerformers,
} from '../api/companies';
import {
  getPickupAnalytics,
  getRecentPickups,
  getPendingPickups,
} from '../api/pickups';
import {
  getTrucks,
  getFleetSummary,
} from '../api/trucks';
import {
  AnalyticsQueryParams,
} from '../types/api';

// ============================================================================
// NEW ANALYTICS HOOKS - UPDATED FOR BACKEND IMPLEMENTATION
// ============================================================================

/**
 * Hook for dashboard analytics - Main dashboard data
 */
export function useDashboardAnalytics(params?: AnalyticsQueryParams) {
  return useEnhancedDashboardAnalytics(params);
}

/**
 * Hook for KPI analytics - Key Performance Indicators
 */
export function useKPIAnalytics(params?: AnalyticsQueryParams) {
  return useEnhancedKPIAnalytics(params);
}

/**
 * Hook for trend analytics - Historical trends and patterns
 */
export function useTrendAnalytics(params?: AnalyticsQueryParams) {
  return useEnhancedTrendAnalytics(params);
}



/**
 * Hook for combined analytics - All analytics in one call
 */
export function useCombinedAnalytics(params?: AnalyticsQueryParams) {
  return useEnhancedCombinedAnalytics(params);
}

/**
 * Hook for analytics health check
 */
export function useAnalyticsHealth() {
  return useEnhancedAnalyticsHealth();
}

// Export enhanced analytics management hooks
export { useAnalyticsExport, useAnalyticsDateRange, useAnalyticsRefresh, useAnalyticsAggregation };

// ============================================================================
// LEGACY DASHBOARD KPI HOOKS (BACKWARD COMPATIBILITY)
// ============================================================================

/**
 * Hook for dashboard KPIs (legacy - maps to new dashboard analytics)
 */
export function useDashboardKPIs(params?: AnalyticsQueryParams) {
  return useApi(
    () => getDashboardKPIs(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );
}

/**
 * Hook for analytics summary
 */
export function useAnalyticsSummary(params?: AnalyticsQueryParams) {
  return useApi(
    () => getAnalyticsSummary(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );
}

// ============================================================================
// FLEET ANALYTICS HOOKS
// ============================================================================

/**
 * Hook for fleet analytics
 */
export function useFleetAnalytics(params?: AnalyticsQueryParams) {
  return useApi(
    () => getFleetAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.truckTypeId]
  );
}

/**
 * Hook for fleet summary
 */
export function useFleetSummary() {
  return useApi(() => getFleetSummary());
}

/**
 * Hook for all trucks
 */
export function useTrucks() {
  return useApi(() => getTrucks());
}

// ============================================================================
// COMPANY ANALYTICS HOOKS
// ============================================================================

/**
 * Hook for all companies
 */
export function useCompanies(params?: {
  includeStats?: boolean;
  activeOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useApi(
    () => getCompanies(params),
    [params?.includeStats, params?.activeOnly, params?.dateFrom, params?.dateTo]
  );
}

/**
 * Hook for top performing companies
 */
export function useTopPerformers(params?: {
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useApi(
    () => getTopPerformers(params),
    [params?.limit, params?.dateFrom, params?.dateTo]
  );
}

// ============================================================================
// PICKUP ANALYTICS HOOKS
// ============================================================================



/**
 * Hook for pickup analytics
 */
export function usePickupAnalytics(params?: {
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
}) {
  return useApi(
    () => getPickupAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId]
  );
}

/**
 * Hook for recent pickups
 */
export function useRecentPickups(limit: number = 10) {
  return useApi(
    () => getRecentPickups(limit),
    [limit]
  );
}

/**
 * Hook for pending pickups
 */
export function usePendingPickups() {
  return useApi(() => getPendingPickups());
}

// ============================================================================
// TREND ANALYTICS HOOKS
// ============================================================================

/**
 * Hook for revenue trends
 */
export function useRevenueTrends(params?: {
  dateFrom?: string;
  dateTo?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}) {
  return useApi(
    () => getRevenueTrends(params),
    [params?.dateFrom, params?.dateTo, params?.period]
  );
}

/**
 * Hook for pickup trends
 */
export function usePickupTrends(params?: {
  dateFrom?: string;
  dateTo?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}) {
  return useApi(
    () => getPickupTrends(params),
    [params?.dateFrom, params?.dateTo, params?.period]
  );
}

// ============================================================================
// PRESET ANALYTICS HOOKS
// ============================================================================

/**
 * Hook for last 7 days analytics
 */
export function useLast7DaysAnalytics() {
  const dateRange = analyticsPresets.last7Days();
  return useDashboardKPIs(dateRange);
}

/**
 * Hook for last 30 days analytics
 */
export function useLast30DaysAnalytics() {
  const dateRange = analyticsPresets.last30Days();
  return useDashboardKPIs(dateRange);
}

/**
 * Hook for current month analytics
 */
export function useCurrentMonthAnalytics() {
  const dateRange = analyticsPresets.currentMonth();
  return useDashboardKPIs(dateRange);
}

/**
 * Hook for current year analytics
 */
export function useCurrentYearAnalytics() {
  const dateRange = analyticsPresets.currentYear();
  return useDashboardKPIs(dateRange);
}

// ============================================================================
// DASHBOARD STATE MANAGEMENT
// ============================================================================

/**
 * Hook for managing dashboard date range
 * Uses client-side only execution to prevent hydration mismatches
 */
export function useDashboardDateRange(initialRange: 'last7Days' | 'last30Days' | 'currentMonth' | 'currentYear' = 'last30Days') {
  const [range, setRange] = useState(initialRange);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side to prevent hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  const dateRange = useMemo(() => {
    if (!isClient) {
      // Return a default range for SSR to prevent hydration mismatch
      // Always use last30Days for consistent SSR
      return {
        dateFrom: '2025-06-03', // 30 days ago from current date
        dateTo: '2025-07-03'     // current date
      };
    }

    switch (range) {
      case 'last7Days':
        return analyticsPresets.last7Days();
      case 'last30Days':
        return analyticsPresets.last30Days();
      case 'currentMonth':
        return analyticsPresets.currentMonth();
      case 'currentYear':
        return analyticsPresets.currentYear();
      default:
        return analyticsPresets.last30Days();
    }
  }, [range, isClient]);

  return {
    range,
    setRange,
    dateRange,
    isClient, // Expose this so components can show loading states
  };
}

/**
 * Hook for dashboard refresh functionality
 */
export function useDashboardRefresh() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    // Add a small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    setLastRefresh(new Date());
    setIsRefreshing(false);
  }, []);

  return {
    lastRefresh,
    isRefreshing,
    refresh,
  };
}

// ============================================================================
// DASHBOARD ERROR HANDLING
// ============================================================================

/**
 * Hook for handling dashboard errors
 */
export function useDashboardErrorHandler() {
  const [errors, setErrors] = useState<string[]>([]);

  const addError = useCallback((error: string) => {
    setErrors(prev => [...prev, error]);
  }, []);

  const removeError = useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
  };
}
