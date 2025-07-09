

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

/**
 * Repository interface for analytics data operations
 * Provides methods for retrieving aggregated analytics data from the database
 */
export interface IAnalyticsRepository {

  /**
   * Get total revenue for a date range from paid invoices
   * @param dateFrom Optional start date in YYYY-MM-DD format
   * @param dateTo Optional end date in YYYY-MM-DD format
   * @returns Total revenue amount
   */
  getTotalRevenue(dateFrom?: string, dateTo?: string): Promise<number>;
  
  /**
   * Get total pickup count for a date range
   * @param dateFrom Optional start date in YYYY-MM-DD format
   * @param dateTo Optional end date in YYYY-MM-DD format
   * @returns Total number of pickups
   */
  getTotalPickups(dateFrom?: string, dateTo?: string): Promise<number>;

  /**
   * Get total company count (optionally active only)
   * @param activeOnly If true, only count companies with pickups in the date range
   * @param dateFrom Optional start date in YYYY-MM-DD format
   * @param dateTo Optional end date in YYYY-MM-DD format
   * @returns Total number of companies
   */
  getTotalCompanies(activeOnly?: boolean, dateFrom?: string, dateTo?: string): Promise<number>;

  /**
   * Get average order value for a date range from paid invoices
   * @param dateFrom Optional start date in YYYY-MM-DD format
   * @param dateTo Optional end date in YYYY-MM-DD format
   * @returns Average order value
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
  
  // ============================================================================
  // OPERATIONAL METRICS
  // ============================================================================
  
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
  
}
