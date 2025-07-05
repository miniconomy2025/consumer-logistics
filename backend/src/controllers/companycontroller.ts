import { Request, Response, NextFunction } from 'express';
import { CompanyService } from '../services/companyService';
import { AppError } from '../shared/errors/ApplicationError';
import { CompanyRegistrationRequest, CompanyRegistrationResponse } from '../types/dtos/CompanyDtos';

export class CompanyController {
    private companyService: CompanyService;

    constructor(companyService: CompanyService = new CompanyService()) {
        this.companyService = companyService;
    }

    public registerCompany = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data: CompanyRegistrationRequest = req.body;
            if (!data.company_name) {
                throw new AppError('Company name is required for registration', 400);
            }
            const newCompany = await this.companyService.registerCompany(data.company_name, data.bank_account_id); 
            const response: CompanyRegistrationResponse = {
                id: newCompany.company_id,
                company_name: newCompany.company_name,
                bank_account_id: newCompany.bank_account_id, 
            };
            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    };

    public getAllCompanies = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const companies = await this.companyService.getAllCompanies();
            const response = companies.map(company => ({
                id: company.company_id, 
                company_name: company.company_name,
                bank_account_id: company.bank_account_id, 
            }));
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };
}