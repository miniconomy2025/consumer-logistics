import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  analyticsPresets,
} from '../api/analytics';
import {
  useDashboardAnalytics as useEnhancedDashboardAnalytics,
  useKPIAnalytics as useEnhancedKPIAnalytics,
  useAnalyticsHealth as useEnhancedAnalyticsHealth,
  useAnalyticsDateRange,
  useAnalyticsRefresh,
  useAnalyticsAggregation,
} from './useAnalytics';
import {
  AnalyticsQueryParams,
} from '../types/api';

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
 * Hook for analytics health check
 */
export function useAnalyticsHealth() {
  return useEnhancedAnalyticsHealth();
}

export { useAnalyticsDateRange, useAnalyticsRefresh, useAnalyticsAggregation };

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
