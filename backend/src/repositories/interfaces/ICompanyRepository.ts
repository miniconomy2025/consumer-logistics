import { CompanyEntity } from '../../database/models/CompanyEntity';

export interface ICompanyRepository {
  // Basic CRUD operations
  findById(id: number): Promise<CompanyEntity | null>;
  findByName(name: string): Promise<CompanyEntity | null>;
  findAll(): Promise<CompanyEntity[]>;
  create(company: Partial<CompanyEntity>): Promise<CompanyEntity>;
  update(id: number, company: Partial<CompanyEntity>): Promise<CompanyEntity | null>;
  delete(id: number): Promise<boolean>;

  // Analytics and statistics operations
  findWithStats(id: number, dateFrom?: string, dateTo?: string): Promise<{
    company: CompanyEntity;
    totalPickups: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastPickupDate: string | null;
  } | null>;

  findAllWithStats(dateFrom?: string, dateTo?: string): Promise<Array<{
    company: CompanyEntity;
    totalPickups: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastPickupDate: string | null;
  }>>;

  findTopPerformers(limit: number, dateFrom?: string, dateTo?: string): Promise<Array<{
    company: CompanyEntity;
    totalRevenue: number;
    totalPickups: number;
    averageOrderValue: number;
    revenueGrowth: number;
    pickupGrowth: number;
    lastPickupDate: string | null;
    performanceScore: number;
    rank: number;
  }>>;
}
