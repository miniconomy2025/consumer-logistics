import { IPickupRepository } from '../repositories/interfaces/IPickupRepository';
import { CreatePickupRequest, PickupResponse } from '../types/dtos/pickupDtos';
import { PickupEntity } from '../database/models/PickupEntity';
import { InvoiceEntity } from '../database/models/InvoiceEntity';
import { PickupStatusEntity } from '../database/models/PickupStatusEntity';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';
import { AppDataSource } from '../database/config'; 

export class PickupService {
  constructor(private pickupRepository: IPickupRepository) {}

  async createPickupRequest(data: CreatePickupRequest): Promise<PickupResponse> {
    logger.info('Attempting to create new pickup request.');

    const unit_price = 10;
    const amount = data.quantity * unit_price;

    // 1. Find the status_id for "Awaiting Payment"
    const pickupStatusRepository = AppDataSource.getRepository(PickupStatusEntity);
    const status = await pickupStatusRepository.findOneBy({ status_name: 'Awaiting Payment' });
    if (!status) {
      logger.error('Pickup status "Awaiting Payment" not found.');
      throw new AppError('Pickup status "Awaiting Payment" not found.', 500);
    }

    // 2. Create and save the invoice
    const invoiceRepository = AppDataSource.getRepository(InvoiceEntity);
    const invoice = invoiceRepository.create({
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

    // 3. Use the found pickup_status_id
    const pickup: Partial<PickupEntity> = {
      invoice_id: savedInvoice.invoice_id,
      pickup_status_id: status.pickup_status_id,
      unit_price,
      customer: data.customer,
      pickup_date: null,
    };

    try {
      await this.pickupRepository.create(pickup);

      return {
        referenceNo: savedInvoice.invoice_id.toString(),
        amount: amount.toFixed(2),
      };
    } catch (error: any) {
      logger.error('Error creating pickup request:', error);
      throw new AppError('Failed to create pickup request due to a database error.', 500);
    }
  }
}