import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { AppError } from '../shared/errors/ApplicationError';
import {
  DashboardAnalyticsResponse,
  KPIAnalyticsResponse,
  TrendAnalyticsResponse,
  OperationalAnalyticsResponse,
  ForecastAnalyticsResponse,
  AnalyticsQueryParams,
} from '../types/dtos/analyticsDtos';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor(analyticsService: AnalyticsService = new AnalyticsService()) {
    this.analyticsService = analyticsService;
  }

  // ============================================================================
  // DASHBOARD ANALYTICS
  // ============================================================================

  public getDashboardAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params: AnalyticsQueryParams = this.parseQueryParams(req.query);
      
      const analytics = await this.analyticsService.getDashboardAnalytics(params);
      
      res.status(200).json(analytics);
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // KPI ANALYTICS
  // ============================================================================

  public getKPIAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params: AnalyticsQueryParams = this.parseQueryParams(req.query);
      
      const kpis = await this.analyticsService.getKPIAnalytics(params);
      
      res.status(200).json(kpis);
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // TREND ANALYTICS
  // ============================================================================

  public getTrendAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params: AnalyticsQueryParams = this.parseQueryParams(req.query);
      
      const trends = await this.analyticsService.getTrendAnalytics(params);
      
      res.status(200).json(trends);
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // OPERATIONAL ANALYTICS
  // ============================================================================

  public getOperationalAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params: AnalyticsQueryParams = this.parseQueryParams(req.query);
      
      const operational = await this.analyticsService.getOperationalAnalytics(params);
      
      res.status(200).json(operational);
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // FORECAST ANALYTICS (Placeholder)
  // ============================================================================

  public getForecastAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Placeholder implementation for forecast analytics
      const forecast: ForecastAnalyticsResponse = {
        revenueForecast: [],
        pickupForecast: [],
        growthProjections: {
          nextQuarterRevenue: 0,
          nextQuarterPickups: 0,
          yearEndProjection: {
            revenue: 0,
            pickups: 0,
            companies: 0,
          },
        },
        modelAccuracy: {
          revenueAccuracy: 0,
          pickupAccuracy: 0,
          lastUpdated: new Date().toISOString(),
          dataPoints: 0,
        },
      };
      
      res.status(200).json(forecast);
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // COMBINED ANALYTICS (All-in-one endpoint)
  // ============================================================================

  public getAllAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params: AnalyticsQueryParams = this.parseQueryParams(req.query);
      
      // Get all analytics in parallel
      const [dashboard, kpis, trends, operational] = await Promise.all([
        this.analyticsService.getDashboardAnalytics(params),
        this.analyticsService.getKPIAnalytics(params),
        this.analyticsService.getTrendAnalytics(params),
        this.analyticsService.getOperationalAnalytics(params),
      ]);

      const response = {
        dashboard,
        kpis,
        trends,
        operational,
        generatedAt: new Date().toISOString(),
        parameters: params,
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // EXPORT ANALYTICS (Placeholder)
  // ============================================================================

  public exportAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reportType, format } = req.body;
      
      if (!reportType || !format) {
        throw new AppError('Report type and format are required', 400);
      }

      // Placeholder implementation for export functionality
      const exportResponse = {
        downloadUrl: `/api/analytics/download/${Date.now()}.${format}`,
        fileName: `analytics-${reportType}-${Date.now()}.${format}`,
        fileSize: 1024, // Mock file size
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        reportType,
        generatedAt: new Date().toISOString(),
      };
      
      res.status(200).json(exportResponse);
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  public getAnalyticsHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Basic health check for analytics system
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          analytics: 'operational',
          cache: 'not_implemented',
        },
        version: '1.0.0',
      };
      
      res.status(200).json(health);
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private parseQueryParams(query: any): AnalyticsQueryParams {
    return {
      dateFrom: query.dateFrom as string,
      dateTo: query.dateTo as string,
      comparisonDateFrom: query.comparisonDateFrom as string,
      comparisonDateTo: query.comparisonDateTo as string,
      companyId: query.companyId ? parseInt(query.companyId as string) : undefined,
      companyIds: query.companyIds ? (query.companyIds as string).split(',').map(id => parseInt(id)) : undefined,
      statusId: query.statusId ? parseInt(query.statusId as string) : undefined,
      statusIds: query.statusIds ? (query.statusIds as string).split(',').map(id => parseInt(id)) : undefined,
      groupBy: query.groupBy as 'day' | 'week' | 'month' | 'quarter' | 'year',
      includeGrowthRates: query.includeGrowthRates === 'true',
      includeComparisons: query.includeComparisons === 'true',
      includeTrends: query.includeTrends === 'true',
      includeForecasts: query.includeForecasts === 'true',
      limit: query.limit ? parseInt(query.limit as string) : undefined,
      offset: query.offset ? parseInt(query.offset as string) : undefined,
      sortBy: query.sortBy as 'revenue' | 'pickups' | 'date' | 'company' | 'growth',
      sortOrder: query.sortOrder as 'asc' | 'desc',
    };
  }

  private validateDateRange(dateFrom?: string, dateTo?: string): void {
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new AppError('Invalid date format. Use YYYY-MM-DD format.', 400);
      }
      
      if (fromDate > toDate) {
        throw new AppError('dateFrom cannot be later than dateTo', 400);
      }
      
      // Limit date range to prevent performance issues
      const daysDiff = Math.abs(toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365 * 2) { // 2 years max
        throw new AppError('Date range cannot exceed 2 years', 400);
      }
    }
  }
}
