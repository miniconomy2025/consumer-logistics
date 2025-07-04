import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/config';
import { CompanyEntity } from '../../database/models/CompanyEntity';
import { PickupEntity } from '../../database/models/PickupEntity';
import { InvoiceEntity } from '../../database/models/InvoiceEntity';
import { ICompanyRepository } from '../interfaces/ICompanyRepository';
import { AppError } from '../../shared/errors/ApplicationError';
import { logger } from '../../utils/logger';

export class CompanyRepository implements ICompanyRepository {
  private ormCompanyRepository: Repository<CompanyEntity>;
  private ormPickupRepository: Repository<PickupEntity>;
  private ormInvoiceRepository: Repository<InvoiceEntity>;

  constructor() {
    this.ormCompanyRepository = AppDataSource.getRepository(CompanyEntity);
    this.ormPickupRepository = AppDataSource.getRepository(PickupEntity);
    this.ormInvoiceRepository = AppDataSource.getRepository(InvoiceEntity);
  }

  // --- Basic CRUD Operations ---

  async findById(id: number): Promise<CompanyEntity | null> {
    logger.debug(`Fetching company by ID: ${id}`);
    return this.ormCompanyRepository.findOne({ where: { company_id: id } });
  }

  async findByName(name: string): Promise<CompanyEntity | null> {
    logger.debug(`Fetching company by name: ${name}`);
    return this.ormCompanyRepository.findOne({ where: { company_name: name } });
  }

  async findAll(): Promise<CompanyEntity[]> {
    logger.debug('Fetching all companies.');
    return this.ormCompanyRepository.find();
  }

  async create(company: Partial<CompanyEntity>): Promise<CompanyEntity> {
    logger.info('Attempting to create new company.');
    
    // Check if company name already exists
    if (company.company_name) {
      const existingCompany = await this.findByName(company.company_name);
      if (existingCompany) {
        throw new AppError('Company with this name already exists.', 409);
      }
    }

    const newCompany = this.ormCompanyRepository.create(company);
    try {
      return await this.ormCompanyRepository.save(newCompany);
    } catch (error: any) {
      logger.error('Error creating company:', error);
      throw new AppError('Failed to create company due to a database error.', 500);
    }
  }

  async update(id: number, company: Partial<CompanyEntity>): Promise<CompanyEntity | null> {
    logger.info(`Attempting to update company with ID: ${id}.`);
    
    const existingCompany = await this.ormCompanyRepository.findOneBy({ company_id: id });
    if (!existingCompany) {
      return null;
    }

    // Check if new company name already exists (if being updated)
    if (company.company_name && company.company_name !== existingCompany.company_name) {
      const nameExists = await this.findByName(company.company_name);
      if (nameExists) {
        throw new AppError('Company with this name already exists.', 409);
      }
    }

    this.ormCompanyRepository.merge(existingCompany, company);
    try {
      return await this.ormCompanyRepository.save(existingCompany);
    } catch (error: any) {
      logger.error('Error updating company:', error);
      throw new AppError('Failed to update company due to a database error.', 500);
    }
  }

  async delete(id: number): Promise<boolean> {
    logger.info(`Attempting to delete company with ID: ${id}.`);
    
    // Check if company has associated pickups
    const pickupCount = await this.ormPickupRepository.count({ where: { company_id: id } });
    if (pickupCount > 0) {
      throw new AppError('Cannot delete company with existing pickups. Please remove all pickups first.', 409);
    }

    const result = await this.ormCompanyRepository.delete(id);
    return result.affected !== 0;
  }

  // --- Analytics and Statistics Operations ---

  async findWithStats(id: number, dateFrom?: string, dateTo?: string): Promise<{
    company: CompanyEntity;
    totalPickups: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastPickupDate: string | null;
  } | null> {
    logger.debug(`Fetching company with stats for ID: ${id}`);
    
    const company = await this.findById(id);
    if (!company) {
      return null;
    }

    // Build query for pickups with date filtering
    let pickupQuery = this.ormPickupRepository
      .createQueryBuilder('pickup')
      .leftJoin('pickup.invoice', 'invoice')
      .where('pickup.company_id = :companyId', { companyId: id });

    if (dateFrom) {
      pickupQuery = pickupQuery.andWhere('pickup.pickup_date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      pickupQuery = pickupQuery.andWhere('pickup.pickup_date <= :dateTo', { dateTo });
    }

    const pickups = await pickupQuery.getMany();
    
    // Calculate statistics
    const totalPickups = pickups.length;
    let totalRevenue = 0;
    let lastPickupDate: string | null = null;

    if (totalPickups > 0) {
      // Get invoice data for revenue calculation
      const invoiceIds = pickups.map(p => p.invoice_id).filter(id => id !== null);
      if (invoiceIds.length > 0) {
        const invoices = await this.ormInvoiceRepository
          .createQueryBuilder('invoice')
          .where('invoice.invoice_id IN (:...invoiceIds)', { invoiceIds })
          .getMany();
        
        totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);
      }

      // Find last pickup date
      const sortedPickups = pickups
        .filter(p => p.pickup_date)
        .sort((a, b) => new Date(b.pickup_date!).getTime() - new Date(a.pickup_date!).getTime());
      
      if (sortedPickups.length > 0) {
        lastPickupDate = sortedPickups[0].pickup_date!.toISOString().split('T')[0];
      }
    }

    const averageOrderValue = totalPickups > 0 ? totalRevenue / totalPickups : 0;

    return {
      company,
      totalPickups,
      totalRevenue,
      averageOrderValue,
      lastPickupDate,
    };
  }

  async findAllWithStats(dateFrom?: string, dateTo?: string): Promise<Array<{
    company: CompanyEntity;
    totalPickups: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastPickupDate: string | null;
  }>> {
    logger.debug('Fetching all companies with stats.');
    
    const companies = await this.findAll();
    const results = [];

    for (const company of companies) {
      const stats = await this.findWithStats(company.company_id, dateFrom, dateTo);
      if (stats) {
        results.push(stats);
      }
    }

    return results;
  }

  async findTopPerformers(limit: number, dateFrom?: string, dateTo?: string): Promise<Array<{
    company: CompanyEntity;
    totalRevenue: number;
    totalPickups: number;
    averageOrderValue: number;
    revenueGrowth: number;
    pickupGrowth: number;
    lastPickupDate: string | null;
    performanceScore: number;
    rank: number;
  }>> {
    logger.debug(`Fetching top ${limit} performing companies.`);
    
    const companiesWithStats = await this.findAllWithStats(dateFrom, dateTo);
    
    // Calculate performance scores and rank
    const companiesWithPerformance = companiesWithStats.map((item, index) => ({
      ...item,
      revenueGrowth: 0, // TODO: Calculate actual growth when historical data is available
      pickupGrowth: 0,  // TODO: Calculate actual growth when historical data is available
      performanceScore: item.totalRevenue * 0.7 + item.totalPickups * 0.3, // Simple scoring algorithm
      rank: index + 1,
    }));

    // Sort by performance score and limit results
    return companiesWithPerformance
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }
}
