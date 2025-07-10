import { useState, useCallback, useMemo, useEffect } from 'react';
import { useApi } from './useApi';
import {
  getDashboardAnalytics,
  getKPIAnalytics,
  getAnalyticsHealth,
  createAnalyticsParams,
} from '../api/analytics';
import {
  AnalyticsQueryParams,
  AnalyticsDateRange,
} from '../types/analytics';

/**
 * Hook for dashboard analytics with range support
 */
export function useDashboardAnalytics(params?: AnalyticsQueryParams) {
  return useApi(
    () => getDashboardAnalytics(params),
    [params?.range, params?.dateFrom, params?.dateTo, params?.companyId]
  );
}

/**
 * Hook for KPI analytics with range support
 */
export function useKPIAnalytics(params?: AnalyticsQueryParams) {
  return useApi(
    () => getKPIAnalytics(params),
    [params?.range, params?.dateFrom, params?.dateTo, params?.companyId]
  );
}

/**
 * Hook for dashboard analytics with predefined range
 */
export function useDashboardAnalyticsWithRange(range: AnalyticsDateRange, additionalParams?: Partial<AnalyticsQueryParams>) {
  const params = useMemo(() => createAnalyticsParams(range, additionalParams), [range, additionalParams]);
  return useDashboardAnalytics(params);
}

/**
 * Hook for KPI analytics with predefined range
 */
export function useKPIAnalyticsWithRange(range: AnalyticsDateRange, additionalParams?: Partial<AnalyticsQueryParams>) {
  const params = useMemo(() => createAnalyticsParams(range, additionalParams), [range, additionalParams]);
  return useKPIAnalytics(params);
}

/**
 * Hook for dashboard analytics with refresh capability
 */
export function useDashboardAnalyticsWithRefresh(params?: AnalyticsQueryParams) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Include refresh trigger in dependencies to force refetch
  const analytics = useApi(
    () => getDashboardAnalytics(params),
    [params?.range, params?.dateFrom, params?.dateTo, params?.companyId, refreshTrigger]
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setIsRefreshing(false);
  }, []);

  return {
    ...analytics,
    refresh,
    isRefreshing: isRefreshing || analytics.loading,
  };
}

/**
 * Hook for KPI analytics with refresh capability
 */
export function useKPIAnalyticsWithRefresh(params?: AnalyticsQueryParams) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Include refresh trigger in dependencies to force refetch
  const kpis = useApi(
    () => getKPIAnalytics(params),
    [params?.range, params?.dateFrom, params?.dateTo, params?.companyId, refreshTrigger]
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setIsRefreshing(false);
  }, []);

  return {
    ...kpis,
    refresh,
    isRefreshing: isRefreshing || kpis.loading,
  };
}

/**
 * Hook for analytics health monitoring
 */
export function useAnalyticsHealth() {
  return useApi(() => getAnalyticsHealth());
}

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

// ============================================================================
// ANALYTICS STATE MANAGEMENT
// ============================================================================

/**
 * Hook for managing analytics date range using predefined ranges
 */
export function useAnalyticsDateRange(initialRange: AnalyticsDateRange = 'last30days') {
  const [range, setRange] = useState<AnalyticsDateRange>(initialRange);
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const analyticsParams = useMemo(() => createAnalyticsParams(range), [range]);

  const updateRange = useCallback((newRange: AnalyticsDateRange) => {
    setRange(newRange);
  }, []);

  return {
    range,
    setRange: updateRange,
    analyticsParams,
    isClient, // Expose this so components can handle loading states
  };
}

/**
 * Hook for analytics refresh functionality
 * This hook provides a refresh mechanism that can be used with analytics hooks
 */
export function useAnalyticsRefresh() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    // Trigger a refresh by updating the trigger value
    setRefreshTrigger(prev => prev + 1);
    setLastRefresh(new Date());
    setIsRefreshing(false);
  }, []);

  return {
    lastRefresh,
    isRefreshing,
    refresh,
    refreshTrigger, // Expose this for other hooks to depend on
  };
}

/**
 * Hook for analytics data aggregation
 */
export function useAnalyticsAggregation(params?: AnalyticsQueryParams) {
  const dashboard = useDashboardAnalytics(params);
  const kpis = useKPIAnalytics(params);

  const aggregatedData = useMemo(() => {
    if (!dashboard.data || !kpis.data) {
      return null;
    }

    return {
      summary: {
        totalRevenue: dashboard.data.totalRevenue,
        totalPickups: dashboard.data.totalPickups,
        totalCompanies: dashboard.data.totalCompanies,
        averageOrderValue: dashboard.data.averageOrderValue,
      },
      performance: {
        revenueGrowth: dashboard.data.revenueGrowth,
        pickupGrowth: dashboard.data.pickupGrowth,
        completionRate: kpis.data.completionRate,
      },
      trends: {
        topCompanies: dashboard.data.topCompanies,
        statusDistribution: dashboard.data.statusDistribution,
      },
    };
  }, [dashboard.data, kpis.data]);

  const isLoading = dashboard.loading || kpis.loading;
  const hasError = dashboard.error || kpis.error;

  return {
    data: aggregatedData,
    loading: isLoading,
    error: hasError,
    refetch: () => {
      dashboard.refetch();
      kpis.refetch();
    },
  };
}
