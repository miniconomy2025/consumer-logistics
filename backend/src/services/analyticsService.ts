import { IAnalyticsRepository } from '../repositories/interfaces/IAnalyticsRepository';
import { AnalyticsRepository } from '../repositories/implementations/AnalyticsRepository';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';
import {
  DashboardAnalyticsResponse,
  KPIAnalyticsResponse,
  TrendAnalyticsResponse,
  OperationalAnalyticsResponse,
  AnalyticsQueryParams,
} from '../types/dtos/analyticsDtos';

export class AnalyticsService {
  private analyticsRepository: IAnalyticsRepository;

  constructor(analyticsRepository: IAnalyticsRepository = new AnalyticsRepository()) {
    this.analyticsRepository = analyticsRepository;
  }

  // ============================================================================
  // DASHBOARD ANALYTICS
  // ============================================================================

  public async getDashboardAnalytics(params?: AnalyticsQueryParams): Promise<DashboardAnalyticsResponse> {
    logger.info('Generating dashboard analytics');

    try {
      const dateFrom = params?.dateFrom;
      const dateTo = params?.dateTo;

      // Calculate comparison period (previous month/period)
      const comparisonDateFrom = params?.comparisonDateFrom;
      const comparisonDateTo = params?.comparisonDateTo;

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

      if (comparisonDateFrom && comparisonDateTo && dateFrom && dateTo) {
        const [revenueGrowthData, pickupGrowthData, companyGrowthData] = await Promise.all([
          this.analyticsRepository.getRevenueGrowth(dateFrom, dateTo, comparisonDateFrom, comparisonDateTo),
          this.analyticsRepository.getPickupGrowth(dateFrom, dateTo, comparisonDateFrom, comparisonDateTo),
          this.analyticsRepository.getCompanyGrowth(dateFrom, dateTo, comparisonDateFrom, comparisonDateTo),
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

  public async getKPIAnalytics(params?: AnalyticsQueryParams): Promise<KPIAnalyticsResponse> {
    logger.info('Generating KPI analytics');

    try {
      const dateFrom = params?.dateFrom;
      const dateTo = params?.dateTo;
      const comparisonDateFrom = params?.comparisonDateFrom;
      const comparisonDateTo = params?.comparisonDateTo;

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

      // Calculate monthly metrics (assuming current period is monthly)
      const monthlyRevenue = totalRevenue;
      const monthlyPickups = totalPickups;

      // Get growth rates if comparison period provided
      let revenueGrowthRate = 0;
      let pickupGrowthRate = 0;

      if (comparisonDateFrom && comparisonDateTo && dateFrom && dateTo) {
        const [revenueGrowth, pickupGrowth] = await Promise.all([
          this.analyticsRepository.getRevenueGrowth(dateFrom, dateTo, comparisonDateFrom, comparisonDateTo),
          this.analyticsRepository.getPickupGrowth(dateFrom, dateTo, comparisonDateFrom, comparisonDateTo),
        ]);

        revenueGrowthRate = revenueGrowth.growthRate;
        pickupGrowthRate = pickupGrowth.growthRate;
      }

      // Calculate additional KPIs
      const newCompanies = 0; // Would need creation date tracking
      const companyRetentionRate = activeCompanies > 0 ? (activeCompanies / totalCompanies) * 100 : 0;
      const averageProcessingTime = 0; // Would need status change tracking

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
        comparisonPeriodStart: comparisonDateFrom || '',
        comparisonPeriodEnd: comparisonDateTo || '',
      };
    } catch (error: any) {
      logger.error('Error generating KPI analytics:', error);
      throw new AppError('Failed to generate KPI analytics', 500);
    }
  }

  // ============================================================================
  // TREND ANALYTICS
  // ============================================================================

  public async getTrendAnalytics(params?: AnalyticsQueryParams): Promise<TrendAnalyticsResponse> {
    logger.info('Generating trend analytics');

    try {
      const dateFrom = params?.dateFrom || this.getDefaultDateFrom();
      const dateTo = params?.dateTo || this.getDefaultDateTo();
      const groupBy = params?.groupBy || 'month';

      // Get revenue trends
      const revenueTrends = await this.analyticsRepository.getRevenueTrends(dateFrom, dateTo, groupBy);

      // Calculate growth rates for revenue trends
      const revenueByMonth = revenueTrends.map((trend, index) => {
        const previousTrend = index > 0 ? revenueTrends[index - 1] : null;
        const growthRate = previousTrend && previousTrend.revenue > 0
          ? ((trend.revenue - previousTrend.revenue) / previousTrend.revenue) * 100
          : 0;

        return {
          month: trend.period,
          revenue: trend.revenue,
          pickupCount: trend.pickupCount,
          averageOrderValue: trend.averageOrderValue,
          growthRate,
        };
      });

      // Get company trends (simplified - top 5 companies)
      const topCompanies = await this.analyticsRepository.getTopCompanies(5, dateFrom, dateTo);
      const companyTrends = topCompanies.map(company => ({
        companyId: company.companyId,
        companyName: company.companyName,
        monthlyData: [{
          month: dateTo.substring(0, 7), // YYYY-MM format
          revenue: company.totalRevenue,
          pickupCount: company.totalPickups,
          averageOrderValue: company.averageOrderValue,
        }],
      }));

      // Get status trends (simplified)
      const statusDistribution = await this.analyticsRepository.getStatusDistribution(dateFrom, dateTo);
      const statusTrends = statusDistribution.map(status => ({
        statusName: status.statusName,
        monthlyData: [{
          month: dateTo.substring(0, 7),
          count: status.count,
          percentage: status.percentage,
        }],
      }));

      // Get seasonal patterns (simplified)
      const seasonalPatterns = {
        quarterlyRevenue: [],
        monthlyAverages: [],
      };

      return {
        revenueByMonth,
        companyTrends,
        statusTrends,
        seasonalPatterns,
      };
    } catch (error: any) {
      logger.error('Error generating trend analytics:', error);
      throw new AppError('Failed to generate trend analytics', 500);
    }
  }

  // ============================================================================
  // OPERATIONAL ANALYTICS
  // ============================================================================

  public async getOperationalAnalytics(params?: AnalyticsQueryParams): Promise<OperationalAnalyticsResponse> {
    logger.info('Generating operational analytics');

    try {
      const dateFrom = params?.dateFrom || this.getDefaultDateFrom();
      const dateTo = params?.dateTo || this.getDefaultDateTo();

      // Get operational metrics
      const [
        processingTimes,
        dailyVolume,
        companyDistributionByRevenue,
        companyDistributionByPickups,
      ] = await Promise.all([
        this.analyticsRepository.getProcessingTimes(dateFrom, dateTo),
        this.analyticsRepository.getDailyVolume(dateFrom, dateTo),
        this.analyticsRepository.getCompanyDistributionByRevenue(dateFrom, dateTo),
        this.analyticsRepository.getCompanyDistributionByPickups(dateFrom, dateTo),
      ]);

      return {
        averageProcessingTime: 0, // Would be calculated from processingTimes
        processingTimeByStatus: processingTimes.map(pt => ({
          fromStatus: pt.fromStatusName,
          toStatus: pt.toStatusName,
          averageDays: pt.averageDays,
        })),
        dailyVolume: dailyVolume.map(dv => ({
          date: dv.date,
          pickupCount: dv.pickupCount,
          revenue: dv.revenue,
        })),
        companyDistribution: {
          byRevenue: companyDistributionByRevenue,
          byPickupCount: companyDistributionByPickups,
        },
        geographicDistribution: [], // Would need location data
        benchmarks: {
          industryAverageOrderValue: 250, // Mock industry benchmark
          industryAverageProcessingTime: 3, // Mock industry benchmark
          ourPerformanceRating: 'good' as const,
        },
      };
    } catch (error: any) {
      logger.error('Error generating operational analytics:', error);
      throw new AppError('Failed to generate operational analytics', 500);
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
    const date = new Date();
    date.setMonth(date.getMonth() - 12); // Last 12 months
    return date.toISOString().split('T')[0];
  }

  private getDefaultDateTo(): string {
    return new Date().toISOString().split('T')[0];
  }
}
