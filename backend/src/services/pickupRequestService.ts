import { IPickupRepository } from '../repositories/interfaces/IPickupRepository';
import { CreatePickupRequest, PickupResponse } from '../types/dtos/pickupDtos';
import { PickupEntity } from '../database/models/PickupEntity';
import { InvoiceEntity } from '../database/models/InvoiceEntity';
import { PickupStatusEntity } from '../database/models/PickupStatusEntity';
import { CompanyEntity } from '../database/models/CompanyEntity';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';
import { AppDataSource } from '../database/config';
import { PickupStatus } from '../types/enums/pickupStatus';
import { v4 as uuidv4 } from 'uuid';

export class PickupService {
  constructor(private pickupRepository: IPickupRepository) {}

  async createPickupRequest(data: CreatePickupRequest): Promise<PickupResponse> {
    logger.info('Attempting to create new pickup request.');

    const unit_price = 10;
    const amount = data.quantity * unit_price;

    // 1. Find or create the company
    const companyRepository = AppDataSource.getRepository(CompanyEntity);
    let company = await companyRepository.findOneBy({ company_name: data.pickupFrom });
    if (!company) {
      company = companyRepository.create({ company_name: data.pickupFrom });
      company = await companyRepository.save(company);
    }

    // 2. Find the status_id for "Order Received"
    const pickupStatusRepository = AppDataSource.getRepository(PickupStatusEntity);
    const status = await pickupStatusRepository.findOneBy({ status_name: PickupStatus.OrderReceived });
    if (!status) {
      logger.error('Pickup status "Order Received" not found.');
      throw new AppError('Pickup status "Order Received" not found.', 500);
    }

    // 3. Create and save the invoice
    const invoiceRepository = AppDataSource.getRepository(InvoiceEntity);
    const invoice = invoiceRepository.create({
      reference_number: uuidv4(),
      total_amount: amount,
      paid: false,
    });

    let savedInvoice: InvoiceEntity;
    try {
      savedInvoice = await invoiceRepository.save(invoice);
    } catch (error: any) {
      logger.error('Error creating invoice:', error);
      throw new AppError('Failed to create invoice due to a database error.', 500);
    }

    // 4. Create the pickup with company association
    const pickup: Partial<PickupEntity> = {
      invoice_id: savedInvoice.invoice_id,
      pickup_status_id: status.pickup_status_id,
      unit_price,
      customer: data.deliveryTo,
      pickup_date: null,
      company_id: company.company_id,
    };

    try {
      await this.pickupRepository.create(pickup);

      return {
        referenceNo: savedInvoice.reference_number,
        amount: amount.toFixed(2),
        accountNumber: process.env.ACCOUNT_NUMBER || '01001123456789', 
      };
    } catch (error: any) {
      logger.error('Error creating pickup request:', error);
      throw new AppError('Failed to create pickup request due to a database error.', 500);
    }
  }
}