import { IPickupRepository } from '../repositories/interfaces/IPickupRepository';
import { PickupRepository } from '../repositories/implementations/PickupRepository';
import { PickupEntity } from '../database/models/PickupEntity';

import { PickupStatusEntity } from '../database/models/PickupStatusEntity';

import { AppDataSource } from '../database/config';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';
import {
  PickupSearchParams,
  PickupStatusResponse,
  PickupAnalyticsResponse,
} from '../types/dtos/pickupDtos';

// DTOs for service layer interactions
export interface PickupData {
  pickupId: number;
  invoiceId: number;
  companyId: number;
  pickupStatusId: number;
  pickupDate: string | null;
  unitPrice: number;
  customer: string;
  company?: {
    companyId: number;
    companyName: string;
  };
  pickupStatus?: {
    pickupStatusId: number;
    statusName: string;
  };
  invoice?: {
    invoiceId: number;
    referenceNumber: string;
    totalAmount: number;
    paid: boolean;
  };
}



export class PickupManagementService {
  private pickupRepository: IPickupRepository;

  constructor(pickupRepository: IPickupRepository = new PickupRepository()) {
    this.pickupRepository = pickupRepository;
  }

  // --- Basic CRUD Operations ---









  // --- Search and Filter Operations ---

  public async searchPickups(params: PickupSearchParams): Promise<{ pickups: PickupData[]; totalCount: number }> {
    logger.debug('Searching pickups with parameters:', params);
    
    const result = await this.pickupRepository.search(params);
    
    return {
      pickups: result.pickups.map(pickup => this.mapPickupEntityToData(pickup)),
      totalCount: result.totalCount,
    };
  }

  public async getPickupsByCompany(companyId: number): Promise<PickupData[]> {
    logger.debug(`Fetching pickups for company ID: ${companyId}`);

    if (companyId <= 0) {
      throw new AppError('Invalid company ID provided.', 400);
    }

    const pickups = await this.pickupRepository.findByCompanyId(companyId);
    return pickups.map(pickup => this.mapPickupEntityToData(pickup));
  }

  public async getPickupsByStatus(statusId: number): Promise<PickupData[]> {
    logger.debug(`Fetching pickups for status ID: ${statusId}`);

    if (statusId <= 0) {
      throw new AppError('Invalid status ID provided.', 400);
    }

    const pickups = await this.pickupRepository.findByStatus(statusId);
    return pickups.map(pickup => this.mapPickupEntityToData(pickup));
  }

  public async getRecentPickups(limit: number = 10): Promise<PickupData[]> {
    logger.debug(`Fetching ${limit} most recent pickups`);

    if (limit <= 0 || limit > 100) {
      throw new AppError('Limit must be between 1 and 100.', 400);
    }

    const pickups = await this.pickupRepository.getRecentPickups(limit);
    return pickups.map(pickup => this.mapPickupEntityToData(pickup));
  }



  // --- Analytics Operations ---

  public async getPickupAnalytics(dateFrom?: string, dateTo?: string): Promise<PickupAnalyticsResponse> {
    logger.debug('Fetching pickup analytics');

    // Get basic counts
    const { pickups: allPickups } = await this.pickupRepository.findAll();
    const totalPickups = allPickups.length;

    // Get revenue
    const totalRevenue = await this.pickupRepository.getTotalRevenue(dateFrom, dateTo);

    // Get status distribution
    const statusCounts = await this.pickupRepository.countByStatus();
    const statusDistribution = statusCounts.map(status => ({
      statusName: status.statusName,
      count: status.count,
      percentage: totalPickups > 0 ? (status.count / totalPickups) * 100 : 0,
    }));

    // Get pending and completed counts
    const pendingPickups = statusCounts.find(s => s.statusName === 'Order Received')?.count || 0;
    const completedPickups = statusCounts.find(s => s.statusName === 'Delivered')?.count || 0;

    const averageOrderValue = totalPickups > 0 ? totalRevenue / totalPickups : 0;

    return {
      totalPickups,
      totalRevenue,
      averageOrderValue,
      pendingPickups,
      completedPickups,
      revenueByMonth: [], // TODO: Implement monthly revenue calculation
      topCompanies: [], // TODO: Implement top companies calculation
      statusDistribution,
    };
  }

  public async getPickupStatuses(): Promise<PickupStatusResponse[]> {
    logger.debug('Fetching all pickup statuses');
    
    const statusRepository = AppDataSource.getRepository(PickupStatusEntity);
    const statuses = await statusRepository.find();
    
    return statuses.map(status => ({
      pickupStatusId: status.pickup_status_id,
      statusName: status.status_name,
    }));
  }

  // --- Utility Methods ---

  private mapPickupEntityToData(pickup: PickupEntity): PickupData {
    return {
      pickupId: pickup.pickup_id,
      invoiceId: pickup.invoice_id,
      companyId: pickup.company_id,
      pickupStatusId: pickup.pickup_status_id,
      pickupDate: pickup.pickup_date ? pickup.pickup_date.toISOString().split('T')[0] : null,
      unitPrice: pickup.unit_price,
      customer: pickup.customer,
      company: pickup.company ? {
        companyId: pickup.company.company_id,
        companyName: pickup.company.company_name,
      } : undefined,
      pickupStatus: pickup.pickupStatus ? {
        pickupStatusId: pickup.pickupStatus.pickup_status_id,
        statusName: pickup.pickupStatus.status_name,
      } : undefined,
      invoice: pickup.invoice ? {
        invoiceId: pickup.invoice.invoice_id,
        referenceNumber: pickup.invoice.reference_number,
        totalAmount: pickup.invoice.total_amount,
        paid: pickup.invoice.paid,
      } : undefined,
    };
  }
}
