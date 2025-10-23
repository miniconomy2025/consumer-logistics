import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { AnalyticsDateRangeService } from '../services/analyticsDateRangeService';
import {
  AnalyticsQueryParams,
} from '../types/dtos/analyticsDtos';

export class AnalyticsController {
  private analyticsService: AnalyticsService;
  private dateRangeService: AnalyticsDateRangeService;

  constructor(analyticsService: AnalyticsService = new AnalyticsService()) {
    this.analyticsService = analyticsService;
    this.dateRangeService = new AnalyticsDateRangeService();
  }


  public getDashboardAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Date filtering removed: always return all-time analytics
      const analytics = await this.analyticsService.getDashboardAnalytics();
      
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
      // Date filtering removed: always return all-time KPIs
      const kpis = await this.analyticsService.getKPIAnalytics();
      
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
    // Validate and parse range parameter
    const range = query.range as string;
    const validatedRange = range && this.dateRangeService.isValidRange(range) ? range : undefined;

    // Validate and parse comparison range parameter
    const comparisonRange = query.comparisonRange as string;
    const validatedComparisonRange = comparisonRange && this.dateRangeService.isValidRange(comparisonRange) ? comparisonRange : undefined;

    return {
      range: validatedRange,
      dateFrom: query.dateFrom as string,
      dateTo: query.dateTo as string,
      comparisonRange: validatedComparisonRange,
      comparisonDateFrom: query.comparisonDateFrom as string,
      comparisonDateTo: query.comparisonDateTo as string,
      companyId: query.companyId ? parseInt(query.companyId as string) : undefined,
    };
  }
}
