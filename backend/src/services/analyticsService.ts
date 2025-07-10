import { IAnalyticsRepository } from '../repositories/interfaces/IAnalyticsRepository';
import { AnalyticsRepository } from '../repositories/implementations/AnalyticsRepository';
import { AnalyticsDateRangeService } from './analyticsDateRangeService';
import { TimeManager } from './timeManager';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';
import {
  DashboardAnalyticsResponse,
  KPIAnalyticsResponse,
  AnalyticsQueryParams,
} from '../types/dtos/analyticsDtos';

export class AnalyticsService {
  private analyticsRepository: IAnalyticsRepository;
  private dateRangeService: AnalyticsDateRangeService;

  constructor(analyticsRepository: IAnalyticsRepository = new AnalyticsRepository()) {
    this.analyticsRepository = analyticsRepository;
    this.dateRangeService = new AnalyticsDateRangeService();
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Resolve date range from params, prioritizing range parameter over explicit dates
   * @param params Optional analytics query parameters
   * @returns Validated date range with dateFrom and dateTo strings
   * @throws AppError if date validation fails
   */
  private resolveDateRange(params?: AnalyticsQueryParams): { dateFrom: string; dateTo: string } {
    try {
      // If range parameter is provided, use it
      if (params?.range) {
        return this.dateRangeService.convertRangeToDateStrings(params.range);
      }

      // Fall back to explicit dates if provided
      if (params?.dateFrom && params?.dateTo) {
        // Validate date format
        const fromDate = new Date(params.dateFrom);
        const toDate = new Date(params.dateTo);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          throw new AppError('Invalid date format. Use YYYY-MM-DD format.', 400);
        }

        if (fromDate > toDate) {
          throw new AppError('dateFrom cannot be later than dateTo', 400);
        }

        return { dateFrom: params.dateFrom, dateTo: params.dateTo };
      }

      // Default to last 30 days
      const defaultRange = this.dateRangeService.getDefaultRange();
      return this.dateRangeService.convertRangeToDateStrings(defaultRange);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error resolving date range:', error);
      throw new AppError('Failed to resolve date range', 500);
    }
  }

  /**
   * Resolve comparison date range for growth calculations
   */
  private resolveComparisonDateRange(params?: AnalyticsQueryParams): { dateFrom: string; dateTo: string } | null {
    // If comparison range parameter is provided, use it
    if (params?.comparisonRange) {
      return this.dateRangeService.getComparisonRange(params.comparisonRange);
    }

    // Fall back to explicit comparison dates if provided
    if (params?.comparisonDateFrom && params?.comparisonDateTo) {
      return { dateFrom: params.comparisonDateFrom, dateTo: params.comparisonDateTo };
    }

    // If main range is provided, calculate comparison automatically
    if (params?.range) {
      return this.dateRangeService.getComparisonRange(params.range);
    }

    return null;
  }

  // ============================================================================
  // DASHBOARD ANALYTICS
  // ============================================================================

  /**
   * Generate comprehensive dashboard analytics including KPIs, trends, and activity data
   * @param params Optional query parameters for filtering and date ranges
   * @returns Dashboard analytics with revenue, pickup, and company metrics
   */
  public async getDashboardAnalytics(params?: AnalyticsQueryParams): Promise<DashboardAnalyticsResponse> {
    logger.info('Generating dashboard analytics');

    try {
      // Resolve date ranges using TimeManager
      const { dateFrom, dateTo } = this.resolveDateRange(params);
      const comparisonRange = this.resolveComparisonDateRange(params);

      logger.debug(`Dashboard analytics date range: ${dateFrom} to ${dateTo}`);
      if (comparisonRange) {
        logger.debug(`Comparison range: ${comparisonRange.dateFrom} to ${comparisonRange.dateTo}`);
      }

      // Get basic metrics
      const [
        totalRevenue,
        totalPickups,
        totalCompanies,
        averageOrderValue,
        pendingPickupsRatio,
        completionRate,
      ] = await Promise.all([
        this.analyticsRepository.getTotalRevenue(dateFrom, dateTo),
        this.analyticsRepository.getTotalPickups(dateFrom, dateTo),
        this.analyticsRepository.getTotalCompanies(false),
        this.analyticsRepository.getAverageOrderValue(dateFrom, dateTo),
        this.analyticsRepository.getPendingPickupsRatio(dateFrom, dateTo),
        this.analyticsRepository.getCompletionRate(dateFrom, dateTo),
      ]);

      // Get growth metrics if comparison period is provided
      let revenueGrowth = 0;
      let pickupGrowth = 0;
      let companyGrowth = 0;

      if (comparisonRange) {
        const [revenueGrowthData, pickupGrowthData, companyGrowthData] = await Promise.all([
          this.analyticsRepository.getRevenueGrowth(dateFrom, dateTo, comparisonRange.dateFrom, comparisonRange.dateTo),
          this.analyticsRepository.getPickupGrowth(dateFrom, dateTo, comparisonRange.dateFrom, comparisonRange.dateTo),
          this.analyticsRepository.getCompanyGrowth(dateFrom, dateTo, comparisonRange.dateFrom, comparisonRange.dateTo),
        ]);

        revenueGrowth = revenueGrowthData.growthRate;
        pickupGrowth = pickupGrowthData.growthRate;
        companyGrowth = companyGrowthData.growthRate;
      }

      // Get additional dashboard data
      const [
        recentActivity,
        topCompanies,
        statusDistribution,
        revenueTrend,
      ] = await Promise.all([
        this.analyticsRepository.getRecentActivity(10),
        this.analyticsRepository.getTopCompanies(5, dateFrom, dateTo),
        this.analyticsRepository.getStatusDistribution(dateFrom, dateTo),
        this.getRevenueTrendForDashboard(dateFrom, dateTo),
      ]);

      // Calculate derived metrics
      const activeCompanies = await this.analyticsRepository.getTotalCompanies(true, dateFrom, dateTo);
      const pendingPickups = Math.round((totalPickups * pendingPickupsRatio) / 100);
      const completedPickups = Math.round((totalPickups * completionRate) / 100);

      return {
        totalRevenue,
        totalPickups,
        totalCompanies,
        averageOrderValue,
        revenueGrowth,
        pickupGrowth,
        companyGrowth,
        pendingPickups,
        completedPickups,
        activeCompanies,
        recentPickups: recentActivity.map(activity => ({
          pickupId: activity.pickupId,
          companyName: activity.companyName,
          customer: activity.customer,
          amount: activity.amount,
          status: activity.statusName,
          date: activity.pickupDate ? activity.pickupDate.toISOString().split('T')[0] : '',
        })),
        topCompanies: topCompanies.map(company => ({
          companyId: company.companyId,
          companyName: company.companyName,
          totalRevenue: company.totalRevenue,
          totalPickups: company.totalPickups,
          averageOrderValue: company.averageOrderValue,
        })),
        statusDistribution: statusDistribution.map(status => ({
          statusName: status.statusName,
          count: status.count,
          percentage: status.percentage,
        })),
        revenueTrend,
      };
    } catch (error: any) {
      logger.error('Error generating dashboard analytics:', error);
      throw new AppError('Failed to generate dashboard analytics', 500);
    }
  }

  // ============================================================================
  // KPI ANALYTICS
  // ============================================================================

  /**
   * Generate detailed Key Performance Indicator analytics
   * @param params Optional query parameters for filtering and date ranges
   * @returns Comprehensive KPI metrics including financial, operational, and customer metrics
   */
  public async getKPIAnalytics(params?: AnalyticsQueryParams): Promise<KPIAnalyticsResponse> {
    logger.info('Generating KPI analytics');

    try {
      // Resolve date ranges using TimeManager
      const { dateFrom, dateTo } = this.resolveDateRange(params);
      const comparisonRange = this.resolveComparisonDateRange(params);

      logger.debug(`KPI analytics date range: ${dateFrom} to ${dateTo}`);
      if (comparisonRange) {
        logger.debug(`Comparison range: ${comparisonRange.dateFrom} to ${comparisonRange.dateTo}`);
      }

      // Get current period metrics
      const [
        totalRevenue,
        totalPickups,
        totalCompanies,
        averageOrderValue,
        activeCompanies,
        averagePickupsPerCompany,
        completionRate,
        pendingPickupsRatio,
      ] = await Promise.all([
        this.analyticsRepository.getTotalRevenue(dateFrom, dateTo),
        this.analyticsRepository.getTotalPickups(dateFrom, dateTo),
        this.analyticsRepository.getTotalCompanies(false),
        this.analyticsRepository.getAverageOrderValue(dateFrom, dateTo),
        this.analyticsRepository.getTotalCompanies(true, dateFrom, dateTo),
        this.analyticsRepository.getAveragePickupsPerCompany(dateFrom, dateTo),
        this.analyticsRepository.getCompletionRate(dateFrom, dateTo),
        this.analyticsRepository.getPendingPickupsRatio(dateFrom, dateTo),
      ]);

      // Calculate current month metrics using TimeManager
      const timeManager = TimeManager.getInstance();
      const currentTime = timeManager.getCurrentTime();
      const currentMonthStart = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-01`;
      const currentMonthEnd = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).toISOString().split('T')[0];

      const monthlyRevenue = await this.analyticsRepository.getTotalRevenue(currentMonthStart, currentMonthEnd);
      const monthlyPickups = await this.analyticsRepository.getTotalPickups(currentMonthStart, currentMonthEnd);

      // Get growth rates if comparison period provided
      let revenueGrowthRate = 0;
      let pickupGrowthRate = 0;

      if (comparisonRange) {
        const [revenueGrowth, pickupGrowth] = await Promise.all([
          this.analyticsRepository.getRevenueGrowth(dateFrom, dateTo, comparisonRange.dateFrom, comparisonRange.dateTo),
          this.analyticsRepository.getPickupGrowth(dateFrom, dateTo, comparisonRange.dateFrom, comparisonRange.dateTo),
        ]);

        revenueGrowthRate = revenueGrowth.growthRate;
        pickupGrowthRate = pickupGrowth.growthRate;
      }

      // Calculate additional KPIs
      // Estimate new companies by finding companies with first pickup in current period
      const companyPerformance = await this.analyticsRepository.getCompanyPerformance(dateFrom, dateTo);
      const newCompanies = companyPerformance.filter(company =>
        company.firstPickupDate &&
        company.firstPickupDate >= new Date(dateFrom || '1900-01-01') &&
        company.firstPickupDate <= new Date(dateTo || '2100-12-31')
      ).length;

      const companyRetentionRate = activeCompanies > 0 ? (activeCompanies / totalCompanies) * 100 : 0;
      const averageProcessingTime = 0; // Would need status change tracking - keeping as placeholder

      return {
        totalRevenue,
        monthlyRevenue,
        averageOrderValue,
        revenueGrowthRate,
        totalPickups,
        monthlyPickups,
        pickupGrowthRate,
        averagePickupsPerCompany,
        totalCompanies,
        activeCompanies,
        newCompanies,
        companyRetentionRate,
        averageProcessingTime,
        completionRate,
        pendingPickupsRatio,
        periodStart: dateFrom || '',
        periodEnd: dateTo || '',
        comparisonPeriodStart: comparisonRange?.dateFrom || '',
        comparisonPeriodEnd: comparisonRange?.dateTo || '',
      };
    } catch (error: any) {
      logger.error('Error generating KPI analytics:', error);
      throw new AppError('Failed to generate KPI analytics', 500);
    }
  }



  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getRevenueTrendForDashboard(dateFrom?: string, dateTo?: string): Promise<Array<{
    month: string;
    revenue: number;
    pickupCount: number;
  }>> {
    const defaultDateFrom = dateFrom || this.getDefaultDateFrom();
    const defaultDateTo = dateTo || this.getDefaultDateTo();

    const trends = await this.analyticsRepository.getRevenueTrends(defaultDateFrom, defaultDateTo, 'month');
    
    return trends.map(trend => ({
      month: trend.period,
      revenue: trend.revenue,
      pickupCount: trend.pickupCount,
    }));
  }

  private getDefaultDateFrom(): string {
    const timeManager = TimeManager.getInstance();
    const currentTime = timeManager.getCurrentTime();
    const date = new Date(currentTime);
    date.setMonth(date.getMonth() - 12); // Last 12 months
    return date.toISOString().split('T')[0];
  }

  private getDefaultDateTo(): string {
    const timeManager = TimeManager.getInstance();
    return timeManager.getCurrentTime().toISOString().split('T')[0];
  }

  /**
   * Categorize status for better analytics insights
   */
  private categorizeStatus(statusName: string): 'pending' | 'completed' | 'failed' {
    switch (statusName) {
      case 'Delivered':
        return 'completed';
      case 'Cancelled':
      case 'Failed':
        return 'failed';
      case 'Order Received':
      case 'Paid To Logistics Co':
      case 'Ready for Collection':
      case 'Collected':
      default:
        return 'pending';
    }
  }
}
