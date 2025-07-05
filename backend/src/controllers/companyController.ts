import { Request, Response, NextFunction } from 'express';
import { CompanyManagementService } from '../services/companyManagementService';
import { AppError } from '../shared/errors/ApplicationError';
import {
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanyResponse,
  CompanyWithStatsResponse,
  CompaniesListResponse,
  CompaniesWithStatsListResponse,
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






}
