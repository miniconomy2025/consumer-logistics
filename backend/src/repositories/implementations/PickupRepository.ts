import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/config';
import { PickupEntity, PickupStatusEnum } from '../../database/models/PickupEntity';
import { PickupStatusEntity } from '../../database/models/PickupStatusEntity';
import { InvoiceEntity } from '../../database/models/InvoiceEntity';
import { IPickupRepository } from '../interfaces/IPickupRepository';
import { AppError } from '../../shared/errors/ApplicationError';
import { logger } from '../../utils/logger';

export class PickupRepository implements IPickupRepository {
    private ormPickupRepository: Repository<PickupEntity>;
    private ormPickupStatusRepository: Repository<PickupStatusEntity>;
    private ormInvoiceRepository: Repository<InvoiceEntity>;

    constructor() {
        this.ormPickupRepository = AppDataSource.getRepository(PickupEntity);
        this.ormPickupStatusRepository = AppDataSource.getRepository(PickupStatusEntity);
        this.ormInvoiceRepository = AppDataSource.getRepository(InvoiceEntity);
    }

    async create(data: Partial<PickupEntity>): Promise<PickupEntity> {
        logger.info('Attempting to create new pickup record.');
        const newPickup = this.ormPickupRepository.create(data);
        try {
            return await this.ormPickupRepository.save(newPickup);
        } catch (error: any) {
            logger.error('Error creating pickup:', error);
            throw new AppError('Failed to create pickup due to a database error.', 500);
        }
    }

    async findById(id: number): Promise<PickupEntity | null> {
        logger.debug(`Fetching pickup by ID: ${id}`);
        return this.ormPickupRepository.findOne({
          where: { pickup_id: id },
            relations: ['company', 'pickup_status', 'invoice', 'logisticsDetails'] 
      });
    }

    

    async findByInvoiceReference(invoiceReference: string): Promise<PickupEntity | null> {
        logger.debug(`Fetching pickup by Invoice Reference: ${invoiceReference}`);
        return this.ormPickupRepository.findOne({
            where: {
                invoice: { reference_number: invoiceReference } 
            },
            relations: ['invoice', 'company', 'pickup_status', 'logisticsDetails']
        });
    }

    async findByCompanyAndStatus(companyId: number, statusName?: PickupStatusEnum): Promise<PickupEntity[]> {
        logger.debug(`Fetching pickups for company ID: ${companyId}, status: ${statusName || 'any'}`);

        const queryBuilder = this.ormPickupRepository.createQueryBuilder('pickup')
            .leftJoinAndSelect('pickup.company', 'company')
            .leftJoinAndSelect('pickup.pickup_status', 'pickupStatus')
            .where('company.company_id = :companyId', { companyId }); 

        if (statusName) {
            queryBuilder.andWhere('pickupStatus.status_name = :statusName', { statusName });
        }

        return queryBuilder.getMany();
    }

    async update(id: number, data: Partial<PickupEntity>): Promise<PickupEntity | null> {
        logger.info(`Attempting to update pickup with ID: ${id}.`);
        const existingPickup = await this.ormPickupRepository.findOneBy({ pickup_id: id });
        if (!existingPickup) {
            return null;
        }
        this.ormPickupRepository.merge(existingPickup, data);
        try {
            return await this.ormPickupRepository.save(existingPickup);
        } catch (error: any) {
            logger.error('Error updating pickup:', error);
            throw new AppError('Failed to update pickup due to a database error.', 500);
        }
    }

    async getPickupStatusId(statusName: PickupStatusEnum): Promise<number> {
        const status = await this.ormPickupStatusRepository.findOneBy({ status_name: statusName });
        if (!status) {
            throw new AppError(`Pickup status '${statusName}' not found in database.`, 500);
        }
        return status.pickup_status_id;
    }

    async updateInvoiceStatus(invoiceId: number, paid: boolean): Promise<InvoiceEntity | null> {
        logger.info(`Attempting to update invoice ${invoiceId} paid status to ${paid}.`);
        const invoice = await this.ormInvoiceRepository.findOneBy({ invoice_id: invoiceId });
        if (!invoice) {
            return null;
        }
        invoice.paid = paid;
        try {
            return await this.ormInvoiceRepository.save(invoice);
        } catch (error: any) {
            logger.error('Error updating invoice status:', error);
            throw new AppError('Failed to update invoice status due to a database error.', 500);
        }
    }

    async createInvoice(data: Partial<InvoiceEntity>): Promise<InvoiceEntity> {
        logger.info('Attempting to create new invoice record.');
        const newInvoice = this.ormInvoiceRepository.create(data);
        try {
            return await this.ormInvoiceRepository.save(newInvoice);
        } catch (error: any) {
            logger.error('Error creating invoice:', error);
            throw new AppError('Failed to create invoice due to a database error.', 500);
        }
    }
}