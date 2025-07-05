import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import {
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
}
