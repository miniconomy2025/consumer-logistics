import { ICompanyRepository } from '../repositories/interfaces/ICompanyRepository';
import { CompanyRepository } from '../repositories/implementations/CompanyRepository';
import { CompanyEntity } from '../database/models/CompanyEntity';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';

// DTOs for service layer interactions
export interface CreateCompanyData {
  companyName: string;
}

export interface UpdateCompanyData {
  companyName?: string;
}

export interface CompanyStatsData {
  companyId: number;
  companyName: string;
  totalPickups: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastPickupDate: string | null;
}

export interface CompanyPerformanceData {
  companyId: number;
  companyName: string;
  totalRevenue: number;
  totalPickups: number;
  averageOrderValue: number;
  revenueGrowth: number;
  pickupGrowth: number;
  lastPickupDate: string | null;
  performanceScore: number;
  rank: number;
}

export class CompanyManagementService {
  private companyRepository: ICompanyRepository;

  constructor(companyRepository: ICompanyRepository = new CompanyRepository()) {
    this.companyRepository = companyRepository;
  }

  // --- Basic CRUD Operations ---

  public async createCompany(data: CreateCompanyData): Promise<CompanyEntity> {
    logger.info('Attempting to create a new company.');

    // Validate company name
    if (!data.companyName || data.companyName.trim().length === 0) {
      throw new AppError('Company name is required.', 400);
    }

    if (data.companyName.length > 255) {
      throw new AppError('Company name must be 255 characters or less.', 400);
    }

    const newCompany = await this.companyRepository.create({
      company_name: data.companyName.trim(),
    });

    logger.info(`Company created with ID: ${newCompany.company_id}`);
    return newCompany;
  }

  public async getCompanyById(id: number): Promise<CompanyEntity | null> {
    logger.debug(`Fetching company by ID: ${id}`);

    if (id <= 0) {
      throw new AppError('Invalid company ID provided.', 400);
    }

    return this.companyRepository.findById(id);
  }

  public async getAllCompanies(): Promise<CompanyEntity[]> {
    logger.debug('Fetching all companies.');
    return this.companyRepository.findAll();
  }

  public async updateCompany(id: number, data: UpdateCompanyData): Promise<CompanyEntity | null> {
    logger.info(`Attempting to update company with ID: ${id}`);

    if (id <= 0) {
      throw new AppError('Invalid company ID provided.', 400);
    }

    // Validate company name if provided
    if (data.companyName !== undefined) {
      if (!data.companyName || data.companyName.trim().length === 0) {
        throw new AppError('Company name cannot be empty.', 400);
      }

      if (data.companyName.length > 255) {
        throw new AppError('Company name must be 255 characters or less.', 400);
      }
    }

    const updateData: Partial<CompanyEntity> = {};
    if (data.companyName !== undefined) {
      updateData.company_name = data.companyName.trim();
    }

    const updatedCompany = await this.companyRepository.update(id, updateData);
    
    if (updatedCompany) {
      logger.info(`Company updated with ID: ${updatedCompany.company_id}`);
    }

    return updatedCompany;
  }

  public async deleteCompany(id: number): Promise<boolean> {
    logger.info(`Attempting to delete company with ID: ${id}`);

    if (id <= 0) {
      throw new AppError('Invalid company ID provided.', 400);
    }

    // Check if company exists
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new AppError('Company not found.', 404);
    }

    const deleted = await this.companyRepository.delete(id);
    
    if (deleted) {
      logger.info(`Company deleted with ID: ${id}`);
    }

    return deleted;
  }

  // --- Analytics and Statistics Operations ---

  public async getCompanyWithStats(
    id: number, 
    dateFrom?: string, 
    dateTo?: string
  ): Promise<CompanyStatsData | null> {
    logger.debug(`Fetching company with stats for ID: ${id}`);

    if (id <= 0) {
      throw new AppError('Invalid company ID provided.', 400);
    }

    const result = await this.companyRepository.findWithStats(id, dateFrom, dateTo);
    
    if (!result) {
      return null;
    }

    return {
      companyId: result.company.company_id,
      companyName: result.company.company_name,
      totalPickups: result.totalPickups,
      totalRevenue: result.totalRevenue,
      averageOrderValue: result.averageOrderValue,
      lastPickupDate: result.lastPickupDate,
    };
  }

  public async getAllCompaniesWithStats(
    dateFrom?: string, 
    dateTo?: string
  ): Promise<CompanyStatsData[]> {
    logger.debug('Fetching all companies with stats.');

    const results = await this.companyRepository.findAllWithStats(dateFrom, dateTo);
    
    return results.map(result => ({
      companyId: result.company.company_id,
      companyName: result.company.company_name,
      totalPickups: result.totalPickups,
      totalRevenue: result.totalRevenue,
      averageOrderValue: result.averageOrderValue,
      lastPickupDate: result.lastPickupDate,
    }));
  }

  public async getTopPerformers(
    limit: number = 10, 
    dateFrom?: string, 
    dateTo?: string
  ): Promise<CompanyPerformanceData[]> {
    logger.debug(`Fetching top ${limit} performing companies.`);

    if (limit <= 0 || limit > 100) {
      throw new AppError('Limit must be between 1 and 100.', 400);
    }

    const results = await this.companyRepository.findTopPerformers(limit, dateFrom, dateTo);
    
    return results.map(result => ({
      companyId: result.company.company_id,
      companyName: result.company.company_name,
      totalRevenue: result.totalRevenue,
      totalPickups: result.totalPickups,
      averageOrderValue: result.averageOrderValue,
      revenueGrowth: result.revenueGrowth,
      pickupGrowth: result.pickupGrowth,
      lastPickupDate: result.lastPickupDate,
      performanceScore: result.performanceScore,
      rank: result.rank,
    }));
  }

  // --- Utility Methods ---

  public async checkCompanyNameAvailability(name: string): Promise<boolean> {
    logger.debug(`Checking availability for company name: ${name}`);

    if (!name || name.trim().length === 0) {
      return false;
    }

    const existingCompany = await this.companyRepository.findByName(name.trim());
    return existingCompany === null;
  }

  public async searchCompaniesByName(query: string): Promise<CompanyEntity[]> {
    logger.debug(`Searching companies by name: ${query}`);

    if (!query || query.trim().length === 0) {
      return [];
    }

    // For now, get all companies and filter in memory
    // In a production system, you'd want to implement proper database search
    const allCompanies = await this.companyRepository.findAll();
    
    const searchTerm = query.trim().toLowerCase();
    return allCompanies.filter(company => 
      company.company_name.toLowerCase().includes(searchTerm)
    );
  }
}
