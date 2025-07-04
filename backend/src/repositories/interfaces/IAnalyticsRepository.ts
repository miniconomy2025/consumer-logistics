import { AnalyticsQueryParams } from '../../types/dtos/analyticsDtos';

// Raw data interfaces for repository layer
export interface RevenueByPeriod {
  period: string; // YYYY-MM or YYYY-MM-DD
  revenue: number;
  pickupCount: number;
  averageOrderValue: number;
}

export interface CompanyPerformanceData {
  companyId: number;
  companyName: string;
  totalRevenue: number;
  totalPickups: number;
  averageOrderValue: number;
  firstPickupDate: Date | null;
  lastPickupDate: Date | null;
}

export interface StatusDistributionData {
  statusId: number;
  statusName: string;
  count: number;
  percentage: number;
}

export interface ProcessingTimeData {
  fromStatusId: number;
  fromStatusName: string;
  toStatusId: number;
  toStatusName: string;
  averageDays: number;
  minDays: number;
  maxDays: number;
}

export interface DailyVolumeData {
  date: string; // YYYY-MM-DD
  pickupCount: number;
  revenue: number;
  averageOrderValue: number;
}

export interface RecentActivityData {
  pickupId: number;
  companyId: number;
  companyName: string;
  customer: string;
  amount: number;
  statusName: string;
  pickupDate: Date | null;
  createdAt: Date;
}

export interface GrowthMetrics {
  currentPeriodValue: number;
  previousPeriodValue: number;
  growthRate: number; // percentage
  absoluteChange: number;
}

export interface IAnalyticsRepository {
  // ============================================================================
  // BASIC METRICS
  // ============================================================================
  
  /**
   * Get total revenue for a date range
   */
  getTotalRevenue(dateFrom?: string, dateTo?: string): Promise<number>;
  
  /**
   * Get total pickup count for a date range
   */
  getTotalPickups(dateFrom?: string, dateTo?: string): Promise<number>;
  
  /**
   * Get total company count (optionally active only)
   */
  getTotalCompanies(activeOnly?: boolean, dateFrom?: string, dateTo?: string): Promise<number>;
  
  /**
   * Get average order value for a date range
   */
  getAverageOrderValue(dateFrom?: string, dateTo?: string): Promise<number>;
  
  // ============================================================================
  // GROWTH METRICS
  // ============================================================================
  
  /**
   * Calculate revenue growth between two periods
   */
  getRevenueGrowth(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ): Promise<GrowthMetrics>;
  
  /**
   * Calculate pickup growth between two periods
   */
  getPickupGrowth(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ): Promise<GrowthMetrics>;
  
  /**
   * Calculate company growth between two periods
   */
  getCompanyGrowth(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ): Promise<GrowthMetrics>;
  
  // ============================================================================
  // TREND ANALYSIS
  // ============================================================================
  
  /**
   * Get revenue trends by period (month, quarter, year)
   */
  getRevenueTrends(
    dateFrom: string,
    dateTo: string,
    groupBy: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): Promise<RevenueByPeriod[]>;
  
  /**
   * Get company performance data
   */
  getCompanyPerformance(
    dateFrom?: string,
    dateTo?: string,
    limit?: number
  ): Promise<CompanyPerformanceData[]>;
  
  /**
   * Get status distribution
   */
  getStatusDistribution(dateFrom?: string, dateTo?: string): Promise<StatusDistributionData[]>;
  
  /**
   * Get daily volume data
   */
  getDailyVolume(dateFrom: string, dateTo: string): Promise<DailyVolumeData[]>;
  
  // ============================================================================
  // OPERATIONAL METRICS
  // ============================================================================
  
  /**
   * Get average processing time between statuses
   */
  getProcessingTimes(dateFrom?: string, dateTo?: string): Promise<ProcessingTimeData[]>;
  
  /**
   * Get completion rate (percentage of completed pickups)
   */
  getCompletionRate(dateFrom?: string, dateTo?: string): Promise<number>;
  
  /**
   * Get pending pickups ratio
   */
  getPendingPickupsRatio(dateFrom?: string, dateTo?: string): Promise<number>;
  
  /**
   * Get average pickups per company
   */
  getAveragePickupsPerCompany(dateFrom?: string, dateTo?: string): Promise<number>;
  
  // ============================================================================
  // RECENT ACTIVITY
  // ============================================================================
  
  /**
   * Get recent pickup activity
   */
  getRecentActivity(limit: number): Promise<RecentActivityData[]>;
  
  /**
   * Get top performing companies
   */
  getTopCompanies(
    limit: number,
    dateFrom?: string,
    dateTo?: string,
    sortBy?: 'revenue' | 'pickups' | 'averageOrderValue'
  ): Promise<CompanyPerformanceData[]>;
  
  // ============================================================================
  // ADVANCED ANALYTICS
  // ============================================================================
  
  /**
   * Get company distribution by revenue ranges
   */
  getCompanyDistributionByRevenue(
    dateFrom?: string,
    dateTo?: string
  ): Promise<Array<{
    range: string;
    companyCount: number;
    totalRevenue: number;
  }>>;
  
  /**
   * Get company distribution by pickup count ranges
   */
  getCompanyDistributionByPickups(
    dateFrom?: string,
    dateTo?: string
  ): Promise<Array<{
    range: string;
    companyCount: number;
    totalPickups: number;
  }>>;
  
  /**
   * Get seasonal patterns (quarterly and monthly averages)
   */
  getSeasonalPatterns(
    dateFrom: string,
    dateTo: string
  ): Promise<{
    quarterlyData: Array<{
      quarter: string;
      revenue: number;
      pickupCount: number;
    }>;
    monthlyAverages: Array<{
      monthName: string;
      averageRevenue: number;
      averagePickups: number;
    }>;
  }>;
  
  /**
   * Get company trends over time
   */
  getCompanyTrends(
    companyIds: number[],
    dateFrom: string,
    dateTo: string,
    groupBy: 'month' | 'quarter'
  ): Promise<Array<{
    companyId: number;
    companyName: string;
    monthlyData: Array<{
      period: string;
      revenue: number;
      pickupCount: number;
      averageOrderValue: number;
    }>;
  }>>;
  
  /**
   * Get status trends over time
   */
  getStatusTrends(
    dateFrom: string,
    dateTo: string,
    groupBy: 'month' | 'quarter'
  ): Promise<Array<{
    statusName: string;
    monthlyData: Array<{
      period: string;
      count: number;
      percentage: number;
    }>;
  }>>;
  
  // ============================================================================
  // FORECASTING DATA
  // ============================================================================
  
  /**
   * Get historical data for forecasting models
   */
  getHistoricalDataForForecasting(
    months: number
  ): Promise<Array<{
    month: string;
    revenue: number;
    pickupCount: number;
    companyCount: number;
  }>>;
  
  /**
   * Get data quality metrics for forecasting accuracy
   */
  getDataQualityMetrics(): Promise<{
    totalDataPoints: number;
    dataCompleteness: number; // percentage
    dataConsistency: number; // percentage
    lastUpdated: Date;
  }>;
}
