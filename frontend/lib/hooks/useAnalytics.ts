// Enhanced Analytics Hooks with Caching and State Management

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi, UseMutationState, useMutation } from './useApi';
import {
  getDashboardAnalytics,
  getKPIAnalytics,
  getTrendAnalytics,
  getOperationalAnalytics,
  getForecastAnalytics,
  getCombinedAnalytics,
  getAnalyticsHealth,
  exportAnalytics,
} from '../api/analytics';
import {
  AnalyticsQueryParams,
  DashboardAnalyticsResponse,
  KPIAnalyticsResponse,
  TrendAnalyticsResponse,
  OperationalAnalyticsResponse,
  ForecastAnalyticsResponse,
  CombinedAnalyticsResponse,
  AnalyticsHealthResponse,
  ExportAnalyticsResponse,
} from '../types/api';

// ============================================================================
// ANALYTICS CACHE MANAGEMENT
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  params: string;
}

class AnalyticsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, params?: AnalyticsQueryParams): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      params: JSON.stringify(params || {}),
    });
  }

  get<T>(key: string, params?: AnalyticsQueryParams): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.TTL;
    const paramsChanged = entry.params !== JSON.stringify(params || {});

    if (isExpired || paramsChanged) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}

const analyticsCache = new AnalyticsCache();

// ============================================================================
// ENHANCED ANALYTICS HOOKS
// ============================================================================

/**
 * Enhanced hook for dashboard analytics with caching
 */
export function useDashboardAnalytics(params?: AnalyticsQueryParams) {
  const cacheKey = 'dashboard-analytics';
  const cachedData = analyticsCache.get<DashboardAnalyticsResponse>(cacheKey, params);

  const apiHook = useApi(
    () => getDashboardAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );

  // Cache successful responses
  useEffect(() => {
    if (apiHook.data && !apiHook.loading && !apiHook.error) {
      analyticsCache.set(cacheKey, apiHook.data, params);
    }
  }, [apiHook.data, apiHook.loading, apiHook.error, params]);

  // Return cached data if available and not loading
  return {
    ...apiHook,
    data: cachedData && apiHook.loading ? cachedData : apiHook.data,
  };
}

/**
 * Enhanced hook for KPI analytics with caching
 */
export function useKPIAnalytics(params?: AnalyticsQueryParams) {
  const cacheKey = 'kpi-analytics';
  const cachedData = analyticsCache.get<KPIAnalyticsResponse>(cacheKey, params);

  const apiHook = useApi(
    () => getKPIAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );

  useEffect(() => {
    if (apiHook.data && !apiHook.loading && !apiHook.error) {
      analyticsCache.set(cacheKey, apiHook.data, params);
    }
  }, [apiHook.data, apiHook.loading, apiHook.error, params]);

  return {
    ...apiHook,
    data: cachedData && apiHook.loading ? cachedData : apiHook.data,
  };
}

/**
 * Enhanced hook for trend analytics with caching
 */
export function useTrendAnalytics(params?: AnalyticsQueryParams) {
  const cacheKey = 'trend-analytics';
  const cachedData = analyticsCache.get<TrendAnalyticsResponse>(cacheKey, params);

  const apiHook = useApi(
    () => getTrendAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );

  useEffect(() => {
    if (apiHook.data && !apiHook.loading && !apiHook.error) {
      analyticsCache.set(cacheKey, apiHook.data, params);
    }
  }, [apiHook.data, apiHook.loading, apiHook.error, params]);

  return {
    ...apiHook,
    data: cachedData && apiHook.loading ? cachedData : apiHook.data,
  };
}

/**
 * Enhanced hook for operational analytics with caching
 */
export function useOperationalAnalytics(params?: AnalyticsQueryParams) {
  const cacheKey = 'operational-analytics';
  const cachedData = analyticsCache.get<OperationalAnalyticsResponse>(cacheKey, params);

  const apiHook = useApi(
    () => getOperationalAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );

  useEffect(() => {
    if (apiHook.data && !apiHook.loading && !apiHook.error) {
      analyticsCache.set(cacheKey, apiHook.data, params);
    }
  }, [apiHook.data, apiHook.loading, apiHook.error, params]);

  return {
    ...apiHook,
    data: cachedData && apiHook.loading ? cachedData : apiHook.data,
  };
}

/**
 * Enhanced hook for forecast analytics with caching
 */
export function useForecastAnalytics(params?: AnalyticsQueryParams) {
  const cacheKey = 'forecast-analytics';
  const cachedData = analyticsCache.get<ForecastAnalyticsResponse>(cacheKey, params);

  const apiHook = useApi(
    () => getForecastAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );

  useEffect(() => {
    if (apiHook.data && !apiHook.loading && !apiHook.error) {
      analyticsCache.set(cacheKey, apiHook.data, params);
    }
  }, [apiHook.data, apiHook.loading, apiHook.error, params]);

  return {
    ...apiHook,
    data: cachedData && apiHook.loading ? cachedData : apiHook.data,
  };
}

/**
 * Enhanced hook for combined analytics with caching
 */
export function useCombinedAnalytics(params?: AnalyticsQueryParams) {
  const cacheKey = 'combined-analytics';
  const cachedData = analyticsCache.get<CombinedAnalyticsResponse>(cacheKey, params);

  const apiHook = useApi(
    () => getCombinedAnalytics(params),
    [params?.dateFrom, params?.dateTo, params?.companyId, params?.truckTypeId]
  );

  useEffect(() => {
    if (apiHook.data && !apiHook.loading && !apiHook.error) {
      analyticsCache.set(cacheKey, apiHook.data, params);
    }
  }, [apiHook.data, apiHook.loading, apiHook.error, params]);

  return {
    ...apiHook,
    data: cachedData && apiHook.loading ? cachedData : apiHook.data,
  };
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
 * Hook for managing analytics date range with persistence
 */
export function useAnalyticsDateRange(initialRange?: AnalyticsQueryParams) {
  const [dateRange, setDateRange] = useState<AnalyticsQueryParams>(
    initialRange || {
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
    }
  );

  const updateDateRange = useCallback((newRange: Partial<AnalyticsQueryParams>) => {
    setDateRange(prev => ({ ...prev, ...newRange }));
    // Clear cache when date range changes
    analyticsCache.clear();
  }, []);

  return {
    dateRange,
    setDateRange: updateDateRange,
  };
}

/**
 * Hook for analytics refresh functionality with cache management
 */
export function useAnalyticsRefresh() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    analyticsCache.clear();
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
      id: Math.random().toString(36).substr(2, 9),
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
    cacheHitRate: 0,
    errorRate: 0,
  });

  const recordLoadTime = useCallback((time: number) => {
    setMetrics(prev => ({ ...prev, loadTime: time }));
  }, []);

  const recordCacheHit = useCallback(() => {
    setMetrics(prev => ({ 
      ...prev, 
      cacheHitRate: Math.min(prev.cacheHitRate + 0.1, 1) 
    }));
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
    recordCacheHit,
    recordError,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for cleaning up expired cache entries
 */
export function useAnalyticsCacheCleanup() {
  useEffect(() => {
    const interval = setInterval(() => {
      analyticsCache.clearExpired();
    }, 60000); // Clean up every minute

    return () => clearInterval(interval);
  }, []);
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
