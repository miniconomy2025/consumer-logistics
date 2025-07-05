import { useState, useCallback, useMemo, useEffect } from 'react';
import { useApi } from './useApi';
import {
  getDashboardAnalytics,
  getKPIAnalytics,
  getAnalyticsHealth,
} from '../api/analytics';
import {
  AnalyticsQueryParams,
} from '../types/api';

// ============================================================================
// ANALYTICS HOOKS
// ============================================================================

/**
 * Hook for dashboard analytics
 */
export function useDashboardAnalytics(params?: AnalyticsQueryParams) {
  return useApi(
    () => getDashboardAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );
}

/**
 * Hook for KPI analytics
 */
export function useKPIAnalytics(params?: AnalyticsQueryParams) {
  return useApi(
    () => getKPIAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );
}

/**
 * Hook for analytics health monitoring
 */
export function useAnalyticsHealth() {
  return useApi(() => getAnalyticsHealth());
}

// ============================================================================
// ANALYTICS STATE MANAGEMENT
// ============================================================================

/**
 * Hook for managing analytics date range
 */
export function useAnalyticsDateRange(initialRange?: AnalyticsQueryParams) {
  const [dateRange, setDateRange] = useState<AnalyticsQueryParams>(() => {
    // Use a static default for SSR to prevent hydration mismatches
    if (initialRange) {
      return initialRange;
    }

    // Static default dates for SSR consistency
    return {
      dateFrom: '2025-06-04', // 30 days ago from a fixed date
      dateTo: '2025-07-04',   // fixed current date
    };
  });

  const [isClient, setIsClient] = useState(false);

  // Set client-side dates after hydration
  useEffect(() => {
    setIsClient(true);

    // Only update to dynamic dates if no initial range was provided
    if (!initialRange) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      setDateRange({
        dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
        dateTo: now.toISOString().split('T')[0],
      });
    }
  }, [initialRange]);

  const updateDateRange = useCallback((newRange: Partial<AnalyticsQueryParams>) => {
    setDateRange(prev => ({ ...prev, ...newRange }));
  }, []);

  return {
    dateRange,
    setDateRange: updateDateRange,
    isClient, // Expose this so components can handle loading states
  };
}

/**
 * Hook for analytics refresh functionality
 */
export function useAnalyticsRefresh() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastRefresh(new Date());
    setIsRefreshing(false);
  }, []);

  return {
    lastRefresh,
    isRefreshing,
    refresh,
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
