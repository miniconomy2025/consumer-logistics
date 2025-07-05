import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/config';
import { CompanyEntity } from '../../database/models/CompanyEntity';
import { ICompanyRepository } from '../interfaces/ICompanyRepository';
import { AppError } from '../../shared/errors/ApplicationError';
import { logger } from '../../utils/logger';

export class CompanyRepository implements ICompanyRepository {
    private ormRepository: Repository<CompanyEntity>; 

    constructor() {
        this.ormRepository = AppDataSource.getRepository(CompanyEntity); 
    }

    async findById(id: number): Promise<CompanyEntity | null> {
        logger.debug(`Fetching company by ID: ${id}`);
        return this.ormRepository.findOneBy({ company_id: id });
    }

    async findByName(name: string): Promise<CompanyEntity | null> {
        logger.debug(`Fetching company by name: ${name}`);
        return this.ormRepository.findOneBy({ company_name: name });
    }

    async findAll(): Promise<CompanyEntity[]> {
        logger.debug('Fetching all companies.');
        return this.ormRepository.find();
    }

    async create(companyName: string, bankAccountId: string | null = null): Promise<CompanyEntity> {
        logger.info(`Attempting to create new company: ${companyName}.`);
        const newCompany = this.ormRepository.create({ company_name: companyName, bank_account_id: bankAccountId }); 
        try {
            return await this.ormRepository.save(newCompany);
        } catch (error: any) {
            if (error.code === '23505' && error.detail.includes('company_name')) { 
                throw new AppError('Company with this name already exists.', 409);
            }
            logger.error('Error creating company:', error);
            throw new AppError('Failed to create company due to a database error.', 500);
        }
    }

    async update(id: number, data: Partial<CompanyEntity>): Promise<CompanyEntity | null> {
        logger.info(`Attempting to update company with ID: ${id}.`);
        const existingCompany = await this.ormRepository.findOneBy({ company_id: id }); 
        if (!existingCompany) {
            return null;
        }
        this.ormRepository.merge(existingCompany, data);
        try {
            return await this.ormRepository.save(existingCompany);
        } catch (error: any) {
            logger.error('Error updating company:', error);
            throw new AppError('Failed to update company due to a database error.', 500);
        }
    }
}