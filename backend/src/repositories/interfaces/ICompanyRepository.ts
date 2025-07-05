import { CompanyEntity } from '../../database/models/CompanyEntity'; 

export interface ICompanyRepository {
    findById(id: number): Promise<CompanyEntity | null>;
    findByName(name: string): Promise<CompanyEntity | null>;
    findAll(): Promise<CompanyEntity[]>;
    create(companyName: string, bankAccountId?: string | null): Promise<CompanyEntity>; 
    update(id: number, data: Partial<CompanyEntity>): Promise<CompanyEntity | null>;
}