import { useState, useCallback, useMemo, useEffect } from 'react';
import { useApi, UseMutationState, useMutation } from './useApi';
import {
  getDashboardAnalytics,
  getKPIAnalytics,
  getTrendAnalytics,
  getOperationalAnalytics,
  getCombinedAnalytics,
  getAnalyticsHealth,
  exportAnalytics,
} from '../api/analytics';
import {
  AnalyticsQueryParams,
  ExportAnalyticsResponse,
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
 * Hook for trend analytics
 */
export function useTrendAnalytics(params?: AnalyticsQueryParams) {
  return useApi(
    () => getTrendAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );
}

/**
 * Hook for operational analytics
 */
export function useOperationalAnalytics(params?: AnalyticsQueryParams) {
  return useApi(
    () => getOperationalAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );
}

/**
 * Hook for combined analytics
 */
export function useCombinedAnalytics(params?: AnalyticsQueryParams) {
  return useApi(
    () => getCombinedAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );
}

/**
 * Hook for analytics health monitoring
 */
export function useAnalyticsHealth() {
  return useApi(() => getAnalyticsHealth());
}

/**
 * Hook for analytics export functionality
 */
export function useAnalyticsExport(): UseMutationState<ExportAnalyticsResponse, { reportType: string; format: string }> {
  return useMutation(({ reportType, format }) => exportAnalytics(reportType, format));
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

/**
 * Hook for analytics error handling and retry logic
 */
export function useAnalyticsErrorHandler() {
  const [errors, setErrors] = useState<Array<{ id: string; message: string; timestamp: Date }>>([]);

  const addError = useCallback((message: string) => {
    const error = {
      id: Math.random().toString(36).substring(2, 11),
      message,
      timestamp: new Date(),
    };
    setErrors(prev => [...prev, error]);
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
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

/**
 * Hook for analytics performance monitoring
 */
export function useAnalyticsPerformance() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    errorRate: 0,
  });

  const recordLoadTime = useCallback((time: number) => {
    setMetrics(prev => ({ ...prev, loadTime: time }));
  }, []);

  const recordError = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      errorRate: Math.min(prev.errorRate + 0.1, 1)
    }));
  }, []);

  return {
    metrics,
    recordLoadTime,
    recordError,
  };
}

/**
 * Hook for analytics data aggregation
 */
export function useAnalyticsAggregation(params?: AnalyticsQueryParams) {
  const dashboard = useDashboardAnalytics(params);
  const kpis = useKPIAnalytics(params);
  const trends = useTrendAnalytics(params);
  const operational = useOperationalAnalytics(params);

  const aggregatedData = useMemo(() => {
    if (!dashboard.data || !kpis.data || !trends.data || !operational.data) {
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
        processingTime: operational.data.averageProcessingTime,
      },
      trends: {
        revenueByMonth: trends.data.revenueByMonth,
        topCompanies: dashboard.data.topCompanies,
        statusDistribution: dashboard.data.statusDistribution,
      },
    };
  }, [dashboard.data, kpis.data, trends.data, operational.data]);

  const isLoading = dashboard.loading || kpis.loading || trends.loading || operational.loading;
  const hasError = dashboard.error || kpis.error || trends.error || operational.error;

  return {
    data: aggregatedData,
    loading: isLoading,
    error: hasError,
    refetch: () => {
      dashboard.refetch();
      kpis.refetch();
      trends.refetch();
      operational.refetch();
    },
  };
}
