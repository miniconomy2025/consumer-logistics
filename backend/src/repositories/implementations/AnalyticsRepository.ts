import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/config';
import { PickupEntity } from '../../database/models/PickupEntity';
import { CompanyEntity } from '../../database/models/CompanyEntity';

import { logger } from '../../utils/logger';

// Type definitions for raw query results
interface RawRevenueResult {
  totalRevenue: string;
}

interface RawPickupCountResult {
  totalPickups: string;
}

interface RawCompanyCountResult {
  totalActiveCompanies: string;
}

interface RawAverageOrderValueResult {
  averageOrderValue: string;
}
import {
  IAnalyticsRepository,
  RevenueByPeriod,
  CompanyPerformanceData,
  StatusDistributionData,
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

    try {
      let query = `
        SELECT SUM(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE 0 END) AS "totalRevenue"
        FROM pickup pickup
        LEFT JOIN invoice invoice ON pickup.invoice_id = invoice.invoice_id
        WHERE invoice.paid = true
      `;
      const params: any[] = [];

      if (dateFrom) {
        query += ` AND pickup.order_date >= $${params.length + 1}`;
        params.push(dateFrom);
      }
      if (dateTo) {
        query += ` AND pickup.order_date <= $${params.length + 1}`;
        params.push(dateTo);
      }

      const result: RawRevenueResult[] = await this.pickupRepository.query(query, params);
      return parseFloat(result[0]?.totalRevenue) || 0;
    } catch (error) {
      logger.error('Error calculating total revenue:', error);
      throw new Error('Failed to calculate total revenue');
    }
  }

  async getTotalPickups(dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating total pickups', { dateFrom, dateTo });

    let query = `
      SELECT COUNT(pickup_id) AS "totalPickups"
      FROM pickup
      WHERE 1=1
    `;
    const params: any[] = [];

    if (dateFrom) {
      query += ` AND order_date >= $${params.length + 1}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND order_date <= $${params.length + 1}`;
      params.push(dateTo);
    }

    const result = await this.pickupRepository.query(query, params);
    return parseInt(result[0]?.totalPickups) || 0;
  }

  async getTotalCompanies(activeOnly?: boolean, dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating total companies', { activeOnly, dateFrom, dateTo });

    if (!activeOnly) {
      return await this.companyRepository.count();
    }

    // Count companies with pickups in the date range
    let query = `
      SELECT COUNT(DISTINCT company.company_id) AS "totalActiveCompanies"
      FROM company company
      INNER JOIN pickup pickup ON company.company_id = pickup.company_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (dateFrom) {
      query += ` AND pickup.order_date >= $${params.length + 1}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND pickup.order_date <= $${params.length + 1}`;
      params.push(dateTo);
    }

    const result = await this.companyRepository.query(query, params);
    return parseInt(result[0]?.totalActiveCompanies) || 0;
  }

  async getAverageOrderValue(dateFrom?: string, dateTo?: string): Promise<number> {
    logger.debug('Calculating average order value', { dateFrom, dateTo });

    let query = `
      SELECT AVG(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE NULL END) AS "averageOrderValue"
      FROM pickup pickup
      LEFT JOIN invoice invoice ON pickup.invoice_id = invoice.invoice_id
      WHERE invoice.paid = true
    `;
    const params: any[] = [];

    if (dateFrom) {
      query += ` AND pickup.order_date >= $${params.length + 1}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND pickup.order_date <= $${params.length + 1}`;
      params.push(dateTo);
    }

    const result = await this.pickupRepository.query(query, params);
    return parseFloat(result[0]?.averageOrderValue) || 0;
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

    let periodFormat: string;
    switch (groupBy) {
      case 'day':
        periodFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        periodFormat = 'YYYY-"W"WW';
        break;
      case 'month':
        periodFormat = 'YYYY-MM';
        break;
      case 'quarter':
        periodFormat = 'YYYY-"Q"Q';
        break;
      case 'year':
        periodFormat = 'YYYY';
        break;
      default:
        periodFormat = 'YYYY-MM';
    }

    const query = `
      SELECT
        TO_CHAR(pickup.order_date, '${periodFormat}') AS period,
        SUM(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE 0 END) AS revenue,
        COUNT(pickup.pickup_id) AS "pickupCount",
        AVG(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE NULL END) AS "averageOrderValue"
      FROM pickup pickup
      LEFT JOIN invoice invoice ON pickup.invoice_id = invoice.invoice_id
      WHERE pickup.order_date >= $1 AND pickup.order_date <= $2
      GROUP BY TO_CHAR(pickup.order_date, '${periodFormat}')
      ORDER BY period ASC;
    `;
    const results = await this.pickupRepository.query(query, [dateFrom, dateTo]);

    return results.map((row: any) => ({
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

    let query = `
      SELECT
        company.company_id AS "companyId",
        company.company_name AS "companyName",
        COALESCE(SUM(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE 0 END), 0) AS "totalRevenue",
        COUNT(pickup.pickup_id) AS "totalPickups",
        COALESCE(AVG(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE NULL END), 0) AS "averageOrderValue",
        MIN(pickup.order_date) AS "firstPickupDate",
        MAX(pickup.order_date) AS "lastPickupDate"
      FROM company company
      LEFT JOIN pickup pickup ON company.company_id = pickup.company_id
      LEFT JOIN invoice invoice ON pickup.invoice_id = invoice.invoice_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Add date filtering if provided
    if (dateFrom) {
      query += ` AND pickup.order_date >= $${params.length + 1}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND pickup.order_date <= $${params.length + 1}`;
      params.push(dateTo);
    }

    query += ` GROUP BY company.company_id, company.company_name ORDER BY "totalRevenue" DESC`;

    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    const results = await this.companyRepository.query(query, params);

    return results.map((row: any) => ({
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

    let query = `
      SELECT
        status.pickup_status_id AS "statusId",
        status.status_name AS "statusName",
        COUNT(pickup.pickup_id) AS count
      FROM pickup_status status
      LEFT JOIN pickup pickup ON status.pickup_status_id = pickup.pickup_status_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Add date filtering if provided
    if (dateFrom) {
      query += ` AND pickup.order_date >= $${params.length + 1}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND pickup.order_date <= $${params.length + 1}`;
      params.push(dateTo);
    }

    query += ` GROUP BY status.pickup_status_id, status.status_name ORDER BY count DESC`;

    const results = await this.pickupRepository.query(query, params);

    const totalCount = results.reduce((sum: number, row: any) => sum + parseInt(row.count), 0);

    return results.map((row: any) => ({
      statusId: parseInt(row.statusId),
      statusName: row.statusName,
      count: parseInt(row.count),
      percentage: totalCount > 0 ? (parseInt(row.count) / totalCount) * 100 : 0,
    }));
  }

  // ============================================================================
  // OPERATIONAL METRICS
  // ============================================================================

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
    // Pending = not yet delivered, cancelled, or failed
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

}
