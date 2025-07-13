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
            const companyName = (req as any).clientName as string;
            const bankAccountId = req.body.bank_account_id as string;

            if (!companyName) {
                throw new AppError('Company name is required for registration', 400);
            }

            const newCompany = await this.companyService.registerCompany(companyName.toLocaleLowerCase(), bankAccountId);

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
        if ((req as any).clientName !== 'consumer-logistics') {
            return res.status(403).json({ message: 'Forbidden: Only consumer-logistics team can access this endpoint.' });
        }

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