import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  createAnalyticsParams,
  analyticsRangeOptions,
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
  AnalyticsDateRange,
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
 * Hook for managing dashboard date range using predefined ranges
 * Server-side date calculation using TimeManager
 */
export function useDashboardDateRange(initialRange: AnalyticsDateRange = 'last30days') {
  const [range, setRange] = useState<AnalyticsDateRange>(initialRange);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side to prevent hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  const analyticsParams = useMemo(() => createAnalyticsParams(range), [range]);

  return {
    range,
    setRange,
    analyticsParams,
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
