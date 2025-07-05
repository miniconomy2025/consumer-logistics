import { ICompanyRepository } from '../repositories/interfaces/ICompanyRepository';
import { CompanyRepository } from '../repositories/implementations/CompanyRepository';
import { CompanyEntity } from '../database/models/CompanyEntity'; 
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';

export class CompanyService {
    private companyRepository: ICompanyRepository;

    constructor(companyRepository: ICompanyRepository = new CompanyRepository()) {
        this.companyRepository = companyRepository;
    }

    public async registerCompany(companyName: string, bankAccountId?: string): Promise<CompanyEntity> {
        logger.info(`Attempting to register new company: ${companyName}`);
        let company = await this.companyRepository.findByName(companyName);
        if (company) {
            throw new AppError(`Company with name '${companyName}' already registered.`, 409);
        }
        company = await this.companyRepository.create(companyName, bankAccountId);
        logger.info(`Company ${company.company_name} registered with ID: ${company.company_id}`); 
        return company;
    }

    public async getCompanyById(id: number): Promise<CompanyEntity | null> {
        logger.debug(`Fetching company by ID: ${id}`);
        return this.companyRepository.findById(id);
    }

    public async getCompanyByName(name: string): Promise<CompanyEntity | null> {
        logger.debug(`Fetching company by name: ${name}`);
        return this.companyRepository.findByName(name);
    }

    public async getAllCompanies(): Promise<CompanyEntity[]> {
        logger.debug('Fetching all registered companies.');
        return this.companyRepository.findAll();
    }

    public async updateCompanyBankAccount(companyId: number, bankAccountId: string): Promise<CompanyEntity> {
        logger.info(`Updating bank account ID for company ${companyId} to ${bankAccountId}.`);
        const updatedCompany = await this.companyRepository.update(companyId, { bank_account_id: bankAccountId });
        if (!updatedCompany) {
            throw new AppError(`Company with ID ${companyId} not found for bank account update.`, 404);
        }
        logger.info(`Company ${companyId} bank account updated.`);
        return updatedCompany;
    }
}