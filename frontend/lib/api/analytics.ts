// Analytics API Service Functions
// Updated to use real backend analytics endpoints

import { api } from './client';
import {
  DashboardAnalyticsResponse,
  KPIAnalyticsResponse,
  TrendAnalyticsResponse,
  OperationalAnalyticsResponse,
  ForecastAnalyticsResponse,
  CombinedAnalyticsResponse,
  AnalyticsHealthResponse,
  ExportAnalyticsResponse,
  AnalyticsQueryParams,
  // Legacy interfaces for backward compatibility
  DashboardKPIsResponse,
  FleetAnalyticsResponse,
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
 * Get trend analytics - Historical trends and patterns
 */
export async function getTrendAnalytics(params?: AnalyticsQueryParams): Promise<TrendAnalyticsResponse> {
  return api.get<TrendAnalyticsResponse>('/analytics/trends', params);
}

/**
 * Get operational analytics - Operational efficiency metrics
 */
export async function getOperationalAnalytics(params?: AnalyticsQueryParams): Promise<OperationalAnalyticsResponse> {
  return api.get<OperationalAnalyticsResponse>('/analytics/operational', params);
}

/**
 * Get forecast analytics - Predictive analytics
 */
export async function getForecastAnalytics(params?: AnalyticsQueryParams): Promise<ForecastAnalyticsResponse> {
  return api.get<ForecastAnalyticsResponse>('/analytics/forecast', params);
}

/**
 * Get combined analytics - All analytics in one call
 */
export async function getCombinedAnalytics(params?: AnalyticsQueryParams): Promise<CombinedAnalyticsResponse> {
  return api.get<CombinedAnalyticsResponse>('/analytics/all', params);
}

/**
 * Get analytics health check
 */
export async function getAnalyticsHealth(): Promise<AnalyticsHealthResponse> {
  return api.get<AnalyticsHealthResponse>('/analytics/health');
}

/**
 * Export analytics data
 */
export async function exportAnalytics(reportType: string, format: string): Promise<ExportAnalyticsResponse> {
  return api.post<ExportAnalyticsResponse>('/analytics/export', { reportType, format });
}

// ============================================================================
// LEGACY/COMPATIBILITY FUNCTIONS
// ============================================================================

/**
 * Get dashboard KPIs (legacy function for backward compatibility)
 * Maps new dashboard analytics to old KPI format
 */
export async function getDashboardKPIs(params?: AnalyticsQueryParams): Promise<DashboardKPIsResponse> {
  const dashboardData = await getDashboardAnalytics(params);

  // Map new format to legacy format
  return {
    fleet: {
      totalTrucks: 0, // Not available in new analytics
      totalCapacity: 0,
      averageDailyCost: 0,
      utilizationRate: 0,
    },
    pickups: {
      totalPickups: dashboardData.totalPickups,
      totalRevenue: dashboardData.totalRevenue,
      averageOrderValue: dashboardData.averageOrderValue,
      pendingPickups: dashboardData.pendingPickups,
    },
    companies: {
      totalCompanies: dashboardData.totalCompanies,
      activeCompanies: dashboardData.activeCompanies,
      topPerformer: dashboardData.topCompanies.length > 0 ? {
        companyName: dashboardData.topCompanies[0].companyName,
        revenue: dashboardData.topCompanies[0].totalRevenue,
      } : {
        companyName: 'No data',
        revenue: 0,
      },
    },
    trends: {
      revenueGrowth: dashboardData.revenueGrowth,
      pickupGrowth: dashboardData.pickupGrowth,
      fleetGrowth: 0, // Not available in new analytics
    },
  };
}

/**
 * Get analytics summary (derived from dashboard analytics)
 */
export async function getAnalyticsSummary(params?: AnalyticsQueryParams): Promise<{
  totalRevenue: number;
  totalPickups: number;
  totalTrucks: number;
  totalCompanies: number;
  revenueGrowth: number;
  pickupGrowth: number;
}> {
  const dashboardData = await getDashboardAnalytics(params);

  return {
    totalRevenue: dashboardData.totalRevenue,
    totalPickups: dashboardData.totalPickups,
    totalTrucks: 0, // Not available in analytics
    totalCompanies: dashboardData.totalCompanies,
    revenueGrowth: dashboardData.revenueGrowth,
    pickupGrowth: dashboardData.pickupGrowth,
  };
}

// ============================================================================
// FLEET ANALYTICS (LEGACY SUPPORT)
// ============================================================================

/**
 * Get fleet analytics (legacy function - fleet data not in analytics endpoints)
 * This would need to be implemented separately or derived from truck endpoints
 */
export async function getFleetAnalytics(_params?: AnalyticsQueryParams): Promise<FleetAnalyticsResponse> {
  console.warn('[LEGACY] getFleetAnalytics called - fleet analytics not implemented in new backend');

  const mockResponse: FleetAnalyticsResponse = {
    totalTrucks: 0,
    totalCapacity: 0,
    averageDailyCost: 0,
    utilizationRate: 0,
    costEfficiency: 0,
    maintenanceCost: 0,
    fuelCost: 0,
    truckTypes: [],
  };

  return Promise.resolve(mockResponse);
}

/**
 * Get fleet utilization trends
 * TODO: Replace with actual API call when backend analytics endpoints are implemented
 */
export async function getFleetUtilizationTrends(_params?: {
  dateFrom?: string;
  dateTo?: string;
  truckTypeId?: number;
}): Promise<{
  month: string;
  utilization: number;
  capacity: number;
  efficiency: number;
}[]> {
  console.warn('[MOCK] getFleetUtilizationTrends called - backend analytics not implemented');
  return Promise.resolve([]);
}

/**
 * Get fleet cost efficiency
 * TODO: Replace with actual API call when backend analytics endpoints are implemented
 */
export async function getFleetCostEfficiency(): Promise<{
  truckId: number;
  truckType: string;
  costPerCapacity: number;
  capacity: number;
  efficiency: number;
}[]> {
  console.warn('[MOCK] getFleetCostEfficiency called - backend analytics not implemented');
  return Promise.resolve([]);
}

// ============================================================================
// TREND ANALYTICS
// ============================================================================

/**
 * Get trend analysis (derived from trend analytics endpoint)
 */
export async function getTrendAnalysis(params: {
  type: 'revenue' | 'pickups' | 'fleet';
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  period: string;
  value: number;
  growth: number;
  trend: 'up' | 'down' | 'stable';
}[]> {
  const trendData = await getTrendAnalytics({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  if (params.type === 'revenue') {
    return trendData.revenueByMonth.map(item => ({
      period: item.month,
      value: item.revenue,
      growth: item.growth,
      trend: item.growth > 0 ? 'up' : item.growth < 0 ? 'down' : 'stable' as const,
    }));
  }

  // For other types, return empty array for now
  return [];
}

/**
 * Get revenue trends (derived from trend analytics)
 */
interface TrendData {
  period: string;
  value: number;
  growth: number;
  trend: 'up' | 'down' | 'stable';
}

export async function getRevenueTrends(params: AnalyticsQueryParams = {}): Promise<TrendData[]> {
  const trendData = await getTrendAnalytics(params);

  return trendData.revenueByMonth.map(item => ({
    period: item.month,
    value: item.revenue,
    growth: item.growth,
    trend: item.growth > 0 ? 'up' : item.growth < 0 ? 'down' : 'stable' as const,
  }));
}

/**
 * Get pickup trends (derived from trend analytics)
 */
export async function getPickupTrends(params?: {
  dateFrom?: string;
  dateTo?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}): Promise<{
  period: string;
  pickups: number;
  growth: number;
}[]> {
  const trendData = await getTrendAnalytics({
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
  });

  return trendData.revenueByMonth.map(item => ({
    period: item.month,
    pickups: item.pickups,
    growth: item.growth,
  }));
}

// ============================================================================
// PERFORMANCE ANALYTICS
// ============================================================================

/**
 * Get performance metrics (derived from operational analytics)
 */
export async function getPerformanceMetrics(params?: AnalyticsQueryParams): Promise<{
  deliverySuccessRate: number;
  averageDeliveryTime: number;
  customerSatisfaction: number;
  fleetUtilization: number;
  costEfficiency: number;
  revenuePerPickup: number;
}> {
  const [operationalData, dashboardData] = await Promise.all([
    getOperationalAnalytics(params),
    getDashboardAnalytics(params),
  ]);

  const revenuePerPickup = dashboardData.totalPickups > 0
    ? dashboardData.totalRevenue / dashboardData.totalPickups
    : 0;

  return {
    deliverySuccessRate: dashboardData.totalPickups > 0
      ? (dashboardData.completedPickups / dashboardData.totalPickups) * 100
      : 0,
    averageDeliveryTime: operationalData.averageProcessingTime,
    customerSatisfaction: 0, // Not available in current analytics
    fleetUtilization: 0, // Not available in current analytics
    costEfficiency: 0, // Not available in current analytics
    revenuePerPickup,
  };
}

/**
 * Get regional performance (derived from operational analytics)
 */
export async function getRegionalPerformance(params?: AnalyticsQueryParams): Promise<{
  region: string;
  revenue: number;
  pickups: number;
  efficiency: number;
  growth: number;
}[]> {
  const operationalData = await getOperationalAnalytics(params);

  return operationalData.geographicDistribution.map(item => ({
    region: item.region,
    revenue: item.revenue,
    pickups: item.pickups,
    efficiency: 0, // Not available in current data
    growth: 0, // Not available in current data
  }));
}

// ============================================================================
// COMPARATIVE ANALYTICS
// ============================================================================

/**
 * Compare periods (derived from KPI analytics)
 */
export async function comparePeriods(params: {
  currentPeriodStart: string;
  currentPeriodEnd: string;
  previousPeriodStart: string;
  previousPeriodEnd: string;
}): Promise<{
  current: {
    revenue: number;
    pickups: number;
    averageOrderValue: number;
  };
  previous: {
    revenue: number;
    pickups: number;
    averageOrderValue: number;
  };
  growth: {
    revenue: number;
    pickups: number;
    averageOrderValue: number;
  };
}> {
  // Get current period data
  const currentData = await getKPIAnalytics({
    dateFrom: params.currentPeriodStart,
    dateTo: params.currentPeriodEnd,
  });

  // Get previous period data
  const previousData = await getKPIAnalytics({
    dateFrom: params.previousPeriodStart,
    dateTo: params.previousPeriodEnd,
  });

  return {
    current: {
      revenue: currentData.totalRevenue,
      pickups: currentData.totalPickups,
      averageOrderValue: currentData.averageOrderValue,
    },
    previous: {
      revenue: previousData.totalRevenue,
      pickups: previousData.totalPickups,
      averageOrderValue: previousData.averageOrderValue,
    },
    growth: {
      revenue: currentData.revenueGrowthRate,
      pickups: currentData.pickupGrowthRate,
      averageOrderValue: calculateGrowth(currentData.averageOrderValue, previousData.averageOrderValue),
    },
  };
}

/**
 * Get year-over-year comparison (not implemented in backend yet)
 */
export async function getYearOverYearComparison(year?: number): Promise<{
  currentYear: number;
  previousYear: number;
  metrics: {
    month: string;
    currentYearValue: number;
    previousYearValue: number;
    growth: number;
  }[];
}> {
  console.warn('[NOT IMPLEMENTED] getYearOverYearComparison - endpoint not available');
  const currentYear = year || new Date().getFullYear();
  return Promise.resolve({
    currentYear,
    previousYear: currentYear - 1,
    metrics: [],
  });
}

// ============================================================================
// FORECASTING AND PREDICTIONS
// ============================================================================

/**
 * Get revenue forecast (from forecast analytics endpoint)
 */
export async function getRevenueForecast(params?: {
  months?: number;
  confidence?: number;
}): Promise<{
  period: string;
  predicted: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}[]> {
  const forecastData = await getForecastAnalytics(params);

  return forecastData.revenueForecast.map(item => ({
    period: item.period,
    predicted: item.predicted,
    confidence: item.confidence,
    trend: 'stable' as const, // Trend not provided by backend
  }));
}

/**
 * Get demand forecast (from forecast analytics endpoint)
 */
export async function getDemandForecast(params?: {
  months?: number;
  companyId?: number;
}): Promise<{
  period: string;
  predictedPickups: number;
  confidence: number;
}[]> {
  const forecastData = await getForecastAnalytics(params);

  return forecastData.pickupForecast.map(item => ({
    period: item.period,
    predictedPickups: item.predicted,
    confidence: item.confidence,
  }));
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

/**
 * Calculate growth percentage
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format growth for display
 */
export function formatGrowth(growth: number): string {
  const sign = growth >= 0 ? '+' : '';
  return `${sign}${growth.toFixed(1)}%`;
}


