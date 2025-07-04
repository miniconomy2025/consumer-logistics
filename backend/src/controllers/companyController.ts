import { Request, Response, NextFunction } from 'express';
import { CompanyManagementService } from '../services/companyManagementService';
import { AppError } from '../shared/errors/ApplicationError';
import {
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanyResponse,
  CompanyWithStatsResponse,
  CompanyPerformanceResponse,
  CompaniesListResponse,
  CompaniesWithStatsListResponse,
  CompanyPerformanceListResponse,
} from '../types/dtos/CompanyDtos';

export class CompanyController {
  private companyManagementService: CompanyManagementService;

  constructor(companyManagementService: CompanyManagementService = new CompanyManagementService()) {
    this.companyManagementService = companyManagementService;
  }

  // --- Basic CRUD Endpoints ---

  public createCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreateCompanyRequest = req.body;
      
      if (!data.companyName) {
        throw new AppError('Company name is required.', 400);
      }

      const newCompany = await this.companyManagementService.createCompany({
        companyName: data.companyName,
      });

      const response: CompanyResponse = {
        companyId: newCompany.company_id,
        companyName: newCompany.company_name,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getCompanyById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        throw new AppError('Invalid company ID provided', 400);
      }

      // Check if stats are requested
      const includeStats = req.query.includeStats === 'true';
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      if (includeStats) {
        const companyWithStats = await this.companyManagementService.getCompanyWithStats(
          companyId, 
          dateFrom, 
          dateTo
        );
        
        if (!companyWithStats) {
          throw new AppError('Company not found', 404);
        }

        const response: CompanyWithStatsResponse = {
          companyId: companyWithStats.companyId,
          companyName: companyWithStats.companyName,
          totalPickups: companyWithStats.totalPickups,
          totalRevenue: companyWithStats.totalRevenue,
          averageOrderValue: companyWithStats.averageOrderValue,
          lastPickupDate: companyWithStats.lastPickupDate,
        };

        res.status(200).json(response);
      } else {
        const company = await this.companyManagementService.getCompanyById(companyId);
        
        if (!company) {
          throw new AppError('Company not found', 404);
        }

        const response: CompanyResponse = {
          companyId: company.company_id,
          companyName: company.company_name,
        };

        res.status(200).json(response);
      }
    } catch (error) {
      next(error);
    }
  };

  public getAllCompanies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if stats are requested
      const includeStats = req.query.includeStats === 'true';
      const activeOnly = req.query.activeOnly === 'true';
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      if (includeStats) {
        const companiesWithStats = await this.companyManagementService.getAllCompaniesWithStats(
          dateFrom, 
          dateTo
        );

        // Filter active companies if requested (companies with recent activity)
        let filteredCompanies = companiesWithStats;
        if (activeOnly) {
          filteredCompanies = companiesWithStats.filter(company => 
            company.totalPickups > 0 || company.lastPickupDate !== null
          );
        }

        const response: CompaniesWithStatsListResponse = {
          message: 'Successfully retrieved companies with statistics.',
          totalCount: filteredCompanies.length,
          companies: filteredCompanies.map(company => ({
            companyId: company.companyId,
            companyName: company.companyName,
            totalPickups: company.totalPickups,
            totalRevenue: company.totalRevenue,
            averageOrderValue: company.averageOrderValue,
            lastPickupDate: company.lastPickupDate,
          })),
        };

        res.status(200).json(response);
      } else {
        const companies = await this.companyManagementService.getAllCompanies();

        const response: CompaniesListResponse = {
          message: 'Successfully retrieved all companies.',
          totalCount: companies.length,
          companies: companies.map(company => ({
            companyId: company.company_id,
            companyName: company.company_name,
          })),
        };

        res.status(200).json(response);
      }
    } catch (error) {
      next(error);
    }
  };

  public updateCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        throw new AppError('Invalid company ID provided', 400);
      }

      const data: UpdateCompanyRequest = req.body;
      
      const updatedCompany = await this.companyManagementService.updateCompany(companyId, {
        companyName: data.companyName,
      });

      if (!updatedCompany) {
        throw new AppError('Company not found', 404);
      }

      const response: CompanyResponse = {
        companyId: updatedCompany.company_id,
        companyName: updatedCompany.company_name,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  public deleteCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        throw new AppError('Invalid company ID provided', 400);
      }

      const deleted = await this.companyManagementService.deleteCompany(companyId);

      if (!deleted) {
        throw new AppError('Company not found', 404);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // --- Analytics and Performance Endpoints ---

  public getTopPerformers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      if (limit <= 0 || limit > 100) {
        throw new AppError('Limit must be between 1 and 100', 400);
      }

      const topPerformers = await this.companyManagementService.getTopPerformers(
        limit, 
        dateFrom, 
        dateTo
      );

      const response: CompanyPerformanceListResponse = {
        message: 'Successfully retrieved top performing companies.',
        totalCount: topPerformers.length,
        companies: topPerformers.map(company => ({
          companyId: company.companyId,
          companyName: company.companyName,
          totalRevenue: company.totalRevenue,
          totalPickups: company.totalPickups,
          averageOrderValue: company.averageOrderValue,
          revenueGrowth: company.revenueGrowth,
          pickupGrowth: company.pickupGrowth,
          lastPickupDate: company.lastPickupDate,
          performanceScore: company.performanceScore,
          rank: company.rank,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getCompanyPerformance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        throw new AppError('Invalid company ID provided', 400);
      }

      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      // Get company performance by getting top performers and finding this company
      const topPerformers = await this.companyManagementService.getTopPerformers(
        100, // Get more results to ensure we find the company
        dateFrom, 
        dateTo
      );

      const companyPerformance = topPerformers.find(company => company.companyId === companyId);

      if (!companyPerformance) {
        throw new AppError('Company not found or has no performance data', 404);
      }

      const response: CompanyPerformanceResponse = {
        companyId: companyPerformance.companyId,
        companyName: companyPerformance.companyName,
        totalRevenue: companyPerformance.totalRevenue,
        totalPickups: companyPerformance.totalPickups,
        averageOrderValue: companyPerformance.averageOrderValue,
        revenueGrowth: companyPerformance.revenueGrowth,
        pickupGrowth: companyPerformance.pickupGrowth,
        lastPickupDate: companyPerformance.lastPickupDate,
        performanceScore: companyPerformance.performanceScore,
        rank: companyPerformance.rank,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  // --- Utility Endpoints ---

  public searchCompanies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim().length === 0) {
        throw new AppError('Search query is required', 400);
      }

      const companies = await this.companyManagementService.searchCompaniesByName(query);

      const response: CompaniesListResponse = {
        message: `Found ${companies.length} companies matching "${query}".`,
        totalCount: companies.length,
        companies: companies.map(company => ({
          companyId: company.company_id,
          companyName: company.company_name,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  public checkNameAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const name = req.query.name as string;
      
      if (!name || name.trim().length === 0) {
        throw new AppError('Company name is required', 400);
      }

      const isAvailable = await this.companyManagementService.checkCompanyNameAvailability(name);

      res.status(200).json({
        name: name.trim(),
        available: isAvailable,
      });
    } catch (error) {
      next(error);
    }
  };
}
