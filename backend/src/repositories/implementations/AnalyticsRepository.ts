import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/config';
import { PickupEntity } from '../../database/models/PickupEntity';
import { CompanyEntity } from '../../database/models/CompanyEntity';

import { logger } from '../../utils/logger';
import {
  IAnalyticsRepository,
  RevenueByPeriod,
  CompanyPerformanceData,
  StatusDistributionData,
  ProcessingTimeData,
  DailyVolumeData,
  RecentActivityData,
  GrowthMetrics,
} from '../interfaces/IAnalyticsRepository';

export class AnalyticsRepository implements IAnalyticsRepository {
  private pickupRepository: Repository<PickupEntity>;
  private companyRepository: Repository<CompanyEntity>;

  constructor() {
    this.pickupRepository = AppDataSource.getRepository(PickupEntity);
    this.companyRepository = AppDataSource.getRepository(CompanyEntity);
  }

  // ============================================================================
  // BASIC METRICS
  // ============================================================================

  async getTotalRevenue(dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating total revenue', { dateFrom, dateTo });

    let query = this.pickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.invoice', 'invoice')
      .select('SUM(invoice.total_amount)', 'totalRevenue')
      .where('invoice.paid = :paid', { paid: true }); // Only include paid invoices

    if (dateFrom) {
      query = query.andWhere('pickup.order_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query = query.andWhere('pickup.order_date <= :dateTo', { dateTo });
    }

    const result = await query.getRawOne();
    return parseFloat(result.totalRevenue) || 0;
  }

  async getTotalPickups(dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating total pickups', { dateFrom, dateTo });

    let query = this.pickupRepository.createQueryBuilder('pickup');

    if (dateFrom) {
      query = query.andWhere('pickup.order_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query = query.andWhere('pickup.order_date <= :dateTo', { dateTo });
    }

    return await query.getCount();
  }

  async getTotalCompanies(activeOnly?: boolean, dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating total companies', { activeOnly, dateFrom, dateTo });
    
    if (!activeOnly) {
      return await this.companyRepository.count();
    }

    // Count companies with pickups in the date range
    let query = this.companyRepository
      .createQueryBuilder('company')
      .leftJoin('company.pickups', 'pickup')
      .where('pickup.pickup_id IS NOT NULL');

    if (dateFrom) {
      query = query.andWhere('pickup.order_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query = query.andWhere('pickup.order_date <= :dateTo', { dateTo });
    }

    return await query.getCount();
  }

  async getAverageOrderValue(dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating average order value', { dateFrom, dateTo });

    let query = this.pickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.invoice', 'invoice')
      .select('AVG(invoice.total_amount)', 'averageOrderValue')
      .where('invoice.paid = :paid', { paid: true }); // Only include paid invoices

    if (dateFrom) {
      query = query.andWhere('pickup.order_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query = query.andWhere('pickup.order_date <= :dateTo', { dateTo });
    }

    const result = await query.getRawOne();
    return parseFloat(result.averageOrderValue) || 0;
  }

  // ============================================================================
  // GROWTH METRICS
  // ============================================================================

  async getRevenueGrowth(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ): Promise<GrowthMetrics> {
    logger.debug('Calculating revenue growth', { currentStart, currentEnd, previousStart, previousEnd });
    
    const currentRevenue = await this.getTotalRevenue(currentStart, currentEnd);
    const previousRevenue = await this.getTotalRevenue(previousStart, previousEnd);
    
    const absoluteChange = currentRevenue - previousRevenue;
    const growthRate = previousRevenue > 0 ? (absoluteChange / previousRevenue) * 100 : 0;

    return {
      currentPeriodValue: currentRevenue,
      previousPeriodValue: previousRevenue,
      growthRate,
      absoluteChange,
    };
  }

  async getPickupGrowth(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ): Promise<GrowthMetrics> {
    logger.debug('Calculating pickup growth', { currentStart, currentEnd, previousStart, previousEnd });
    
    const currentPickups = await this.getTotalPickups(currentStart, currentEnd);
    const previousPickups = await this.getTotalPickups(previousStart, previousEnd);
    
    const absoluteChange = currentPickups - previousPickups;
    const growthRate = previousPickups > 0 ? (absoluteChange / previousPickups) * 100 : 0;

    return {
      currentPeriodValue: currentPickups,
      previousPeriodValue: previousPickups,
      growthRate,
      absoluteChange,
    };
  }

  async getCompanyGrowth(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ): Promise<GrowthMetrics> {
    logger.debug('Calculating company growth', { currentStart, currentEnd, previousStart, previousEnd });
    
    const currentCompanies = await this.getTotalCompanies(true, currentStart, currentEnd);
    const previousCompanies = await this.getTotalCompanies(true, previousStart, previousEnd);
    
    const absoluteChange = currentCompanies - previousCompanies;
    const growthRate = previousCompanies > 0 ? (absoluteChange / previousCompanies) * 100 : 0;

    return {
      currentPeriodValue: currentCompanies,
      previousPeriodValue: previousCompanies,
      growthRate,
      absoluteChange,
    };
  }

  // ============================================================================
  // TREND ANALYSIS
  // ============================================================================

  async getRevenueTrends(
    dateFrom: string,
    dateTo: string,
    groupBy: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): Promise<RevenueByPeriod[]> {
    logger.debug('Getting revenue trends', { dateFrom, dateTo, groupBy });
    
    let dateFormat: string;
    switch (groupBy) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      case 'quarter':
        dateFormat = 'YYYY-"Q"Q';
        break;
      case 'year':
        dateFormat = 'YYYY';
        break;
      default:
        dateFormat = 'YYYY-MM';
    }

    const query = this.pickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.invoice', 'invoice')
      .select(`TO_CHAR(pickup.order_date, '${dateFormat}')`, 'period')
      .addSelect('SUM(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE 0 END)', 'revenue')
      .addSelect('COUNT(pickup.pickup_id)', 'pickupCount')
      .addSelect('AVG(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE NULL END)', 'averageOrderValue')
      .where('pickup.order_date >= :dateFrom', { dateFrom })
      .andWhere('pickup.order_date <= :dateTo', { dateTo })
      .groupBy('period')
      .orderBy('period', 'ASC');

    const results = await query.getRawMany();
    
    return results.map(row => ({
      period: row.period,
      revenue: parseFloat(row.revenue) || 0,
      pickupCount: parseInt(row.pickupCount) || 0,
      averageOrderValue: parseFloat(row.averageOrderValue) || 0,
    }));
  }

  async getCompanyPerformance(
    dateFrom?: string,
    dateTo?: string,
    limit?: number
  ): Promise<CompanyPerformanceData[]> {
    logger.debug('Getting company performance', { dateFrom, dateTo, limit });
    
    let query = this.companyRepository
      .createQueryBuilder('company')
      .leftJoin('company.pickups', 'pickup')
      .leftJoin('pickup.invoice', 'invoice')
      .select('company.company_id', 'companyId')
      .addSelect('company.company_name', 'companyName')
      .addSelect('COALESCE(SUM(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE 0 END), 0)', 'totalRevenue')
      .addSelect('COUNT(pickup.pickup_id)', 'totalPickups')
      .addSelect('COALESCE(AVG(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE NULL END), 0)', 'averageOrderValue')
      .addSelect('MIN(pickup.order_date)', 'firstPickupDate')
      .addSelect('MAX(pickup.order_date)', 'lastPickupDate');

    if (dateFrom) {
      query = query.andWhere('pickup.order_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query = query.andWhere('pickup.order_date <= :dateTo', { dateTo });
    }

    query = query
      .groupBy('company.company_id')
      .addGroupBy('company.company_name')
      .orderBy('"totalRevenue"', 'DESC');

    if (limit) {
      query = query.limit(limit);
    }

    const results = await query.getRawMany();
    
    return results.map(row => ({
      companyId: parseInt(row.companyId),
      companyName: row.companyName,
      totalRevenue: parseFloat(row.totalRevenue) || 0,
      totalPickups: parseInt(row.totalPickups) || 0,
      averageOrderValue: parseFloat(row.averageOrderValue) || 0,
      firstPickupDate: row.firstPickupDate ? new Date(row.firstPickupDate) : null,
      lastPickupDate: row.lastPickupDate ? new Date(row.lastPickupDate) : null,
    }));
  }

  async getStatusDistribution(dateFrom?: string, dateTo?: string): Promise<StatusDistributionData[]> {
    logger.debug('Getting status distribution', { dateFrom, dateTo });
    
    let query = this.pickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.pickup_status', 'status')
      .select('status.pickup_status_id', 'statusId')
      .addSelect('status.status_name', 'statusName')
      .addSelect('COUNT(pickup.pickup_id)', 'count');

    if (dateFrom) {
      query = query.andWhere('pickup.order_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query = query.andWhere('pickup.order_date <= :dateTo', { dateTo });
    }

    const results = await query
      .groupBy('status.pickup_status_id')
      .addGroupBy('status.status_name')
      .getRawMany();

    const totalCount = results.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    return results.map(row => ({
      statusId: parseInt(row.statusId),
      statusName: row.statusName,
      count: parseInt(row.count),
      percentage: totalCount > 0 ? (parseInt(row.count) / totalCount) * 100 : 0,
    }));
  }

  async getDailyVolume(dateFrom: string, dateTo: string): Promise<DailyVolumeData[]> {
    logger.debug('Getting daily volume', { dateFrom, dateTo });

    const query = this.pickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.invoice', 'invoice')
      .select('pickup.order_date::date', 'date')
      .addSelect('COUNT(pickup.pickup_id)', 'pickupCount')
      .addSelect('COALESCE(SUM(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE 0 END), 0)', 'revenue')
      .addSelect('COALESCE(AVG(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE NULL END), 0)', 'averageOrderValue')
      .where('pickup.order_date >= :dateFrom', { dateFrom })
      .andWhere('pickup.order_date <= :dateTo', { dateTo })
      .groupBy('pickup.order_date::date')
      .orderBy('pickup.order_date::date', 'ASC');

    const results = await query.getRawMany();

    return results.map(row => ({
      date: row.date,
      pickupCount: parseInt(row.pickupCount) || 0,
      revenue: parseFloat(row.revenue) || 0,
      averageOrderValue: parseFloat(row.averageOrderValue) || 0,
    }));
  }

  // ============================================================================
  // OPERATIONAL METRICS
  // ============================================================================

  async getProcessingTimes(dateFrom?: string, dateTo?: string): Promise<ProcessingTimeData[]> {
    logger.debug('Getting processing times', { dateFrom, dateTo });

    // This is a simplified implementation - in a real system, you'd track status changes
    // For now, we'll return mock data structure
    return [];
  }

  async getCompletionRate(dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating completion rate', { dateFrom, dateTo });

    let query = this.pickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.pickup_status', 'status');

    if (dateFrom) {
      query = query.andWhere('pickup.order_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query = query.andWhere('pickup.order_date <= :dateTo', { dateTo });
    }

    const totalPickups = await query.getCount();

    const completedPickups = await query
      .andWhere('status.status_name = :statusName', { statusName: 'Delivered' })
      .getCount();

    return totalPickups > 0 ? (completedPickups / totalPickups) * 100 : 0;
  }

  async getPendingPickupsRatio(dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating pending pickups ratio', { dateFrom, dateTo });

    let baseQuery = this.pickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.pickup_status', 'status');

    if (dateFrom) {
      baseQuery = baseQuery.andWhere('pickup.order_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      baseQuery = baseQuery.andWhere('pickup.order_date <= :dateTo', { dateTo });
    }

    const totalPickups = await baseQuery.getCount();

    // Create a fresh query for pending pickups to avoid query builder conflicts
    let pendingQuery = this.pickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.pickup_status', 'status')
      .where('status.status_name IN (:...pendingStatuses)', {
        pendingStatuses: ['Order Received', 'Paid To Logistics Co', 'Ready for Collection', 'Collected']
      });

    if (dateFrom) {
      pendingQuery = pendingQuery.andWhere('pickup.order_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      pendingQuery = pendingQuery.andWhere('pickup.order_date <= :dateTo', { dateTo });
    }

    const pendingPickups = await pendingQuery.getCount();

    return totalPickups > 0 ? (pendingPickups / totalPickups) * 100 : 0;
  }

  async getAveragePickupsPerCompany(dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating average pickups per company', { dateFrom, dateTo });

    let query = this.companyRepository
      .createQueryBuilder('company')
      .leftJoin('company.pickups', 'pickup')
      .select('COUNT(pickup.pickup_id)', 'pickupCount');

    if (dateFrom) {
      query = query.andWhere('pickup.order_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query = query.andWhere('pickup.order_date <= :dateTo', { dateTo });
    }

    const result = await query
      .groupBy('company.company_id')
      .getRawMany();

    if (result.length === 0) return 0;

    const totalPickups = result.reduce((sum, row) => sum + parseInt(row.pickupCount), 0);
    return totalPickups / result.length;
  }

  // ============================================================================
  // RECENT ACTIVITY
  // ============================================================================

  async getRecentActivity(limit: number): Promise<RecentActivityData[]> {
    logger.debug('Getting recent activity', { limit });

    const query = this.pickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.company', 'company')
      .leftJoin('pickup.pickup_status', 'status')
      .leftJoin('pickup.invoice', 'invoice')
      .select('pickup.pickup_id', 'pickupId')
      .addSelect('company.company_id', 'companyId')
      .addSelect('company.company_name', 'companyName')
      .addSelect('pickup.recipient_name', 'customer')
      .addSelect('invoice.total_amount', 'amount')
      .addSelect('status.status_name', 'statusName')
      .addSelect('pickup.order_date', 'pickupDate')
      .orderBy('pickup.pickup_id', 'DESC')
      .limit(limit);

    const results = await query.getRawMany();

    return results.map(row => ({
      pickupId: parseInt(row.pickupId),
      companyId: parseInt(row.companyId),
      companyName: row.companyName,
      customer: row.customer,
      amount: parseFloat(row.amount) || 0,
      statusName: row.statusName,
      pickupDate: row.pickupDate ? new Date(row.pickupDate) : null,
      createdAt: new Date(), // Would be actual created_at in real implementation
    }));
  }

  async getTopCompanies(
    limit: number,
    dateFrom?: string,
    dateTo?: string,
    sortBy: 'revenue' | 'pickups' | 'averageOrderValue' = 'revenue'
  ): Promise<CompanyPerformanceData[]> {
    logger.debug('Getting top companies', { limit, dateFrom, dateTo, sortBy });

    const companies = await this.getCompanyPerformance(dateFrom, dateTo);

    // Sort by the specified criteria
    companies.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'pickups':
          return b.totalPickups - a.totalPickups;
        case 'averageOrderValue':
          return b.averageOrderValue - a.averageOrderValue;
        default:
          return b.totalRevenue - a.totalRevenue;
      }
    });

    return companies.slice(0, limit);
  }

  // ============================================================================
  // ADVANCED ANALYTICS (Simplified implementations)
  // ============================================================================

  async getCompanyDistributionByRevenue(
    dateFrom?: string,
    dateTo?: string
  ): Promise<Array<{ range: string; companyCount: number; totalRevenue: number }>> {
    logger.debug('Getting company distribution by revenue', { dateFrom, dateTo });

    const companies = await this.getCompanyPerformance(dateFrom, dateTo);

    const ranges = [
      { min: 0, max: 1000, label: '0-1000' },
      { min: 1000, max: 5000, label: '1000-5000' },
      { min: 5000, max: 10000, label: '5000-10000' },
      { min: 10000, max: Infinity, label: '10000+' },
    ];

    return ranges.map(range => {
      const companiesInRange = companies.filter(
        c => c.totalRevenue >= range.min && c.totalRevenue < range.max
      );

      return {
        range: range.label,
        companyCount: companiesInRange.length,
        totalRevenue: companiesInRange.reduce((sum, c) => sum + c.totalRevenue, 0),
      };
    });
  }

  async getCompanyDistributionByPickups(
    dateFrom?: string,
    dateTo?: string
  ): Promise<Array<{ range: string; companyCount: number; totalPickups: number }>> {
    logger.debug('Getting company distribution by pickups', { dateFrom, dateTo });

    const companies = await this.getCompanyPerformance(dateFrom, dateTo);

    const ranges = [
      { min: 0, max: 10, label: '1-10' },
      { min: 10, max: 50, label: '11-50' },
      { min: 50, max: 100, label: '51-100' },
      { min: 100, max: Infinity, label: '100+' },
    ];

    return ranges.map(range => {
      const companiesInRange = companies.filter(
        c => c.totalPickups >= range.min && c.totalPickups < range.max
      );

      return {
        range: range.label,
        companyCount: companiesInRange.length,
        totalPickups: companiesInRange.reduce((sum, c) => sum + c.totalPickups, 0),
      };
    });
  }


}
