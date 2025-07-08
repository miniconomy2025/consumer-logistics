import { IPickupRepository } from '../repositories/interfaces/IPickupRepository';
import { PickupEntity, PickupStatusEnum } from '../database/models/PickupEntity';
import { ICompanyRepository } from '../repositories/interfaces/ICompanyRepository';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';
import { SimulationService } from './simulationService';
import { LogisticsPlanningService } from './logisticsPlanningService';
import { getLogisticsAccountNumber } from '../utils/bankAccountUtils';

import { CreatePickupRequest, PickupResponse, GetPickupsRequest } from '../types/dtos/pickupDtos';

export class PickupService {
    private pickupRepository: IPickupRepository;
    private companyRepository: ICompanyRepository;
    private simulationService: SimulationService;
    private logisticsPlanningService: LogisticsPlanningService;

    constructor(
        pickupRepository: IPickupRepository,
        companyRepository: ICompanyRepository,
        simulationService: SimulationService,
        logisticsPlanningService: LogisticsPlanningService
    ) {
        this.pickupRepository = pickupRepository;
        this.companyRepository = companyRepository;
        this.simulationService = simulationService;
        this.logisticsPlanningService = logisticsPlanningService;
    }

    public async createPickupRequest(data: CreatePickupRequest): Promise<PickupResponse> {
        logger.info(`Creating new pickup request for company: ${data.pickupFrom} with quantity: ${data.quantity}`);

        const unit_price = 10.0;
        const amount = data.quantity * unit_price;

        let company = await this.companyRepository.findByName(data.pickupFrom);
        if (!company) {
            logger.info(`Company '${data.pickupFrom}' not found. Registering new company.`);
            company = await this.companyRepository.create(data.pickupFrom, null);
            logger.info(`Company '${company.company_name}' registered with ID: ${company.company_id}.`);
        }

        const currentInSimDate = this.simulationService.getInSimulationDate();
        const orderDateOnly = new Date(Date.UTC(currentInSimDate.getUTCFullYear(), currentInSimDate.getUTCMonth(), currentInSimDate.getUTCDate()));

        const pickupStatusId = await this.pickupRepository.getPickupStatusId(PickupStatusEnum.ORDER_RECEIVED);

        const initialInvoice = await this.pickupRepository.createInvoice({
            total_amount: amount,
            paid: false,
        });
        if (!initialInvoice) {
            logger.error('Failed to create initial invoice for pickup.');
            throw new AppError('Failed to create initial invoice for pickup.', 500);
        }

        const pickup: Partial<PickupEntity> = {
            invoice_id: initialInvoice.invoice_id,
            pickup_status_id: pickupStatusId,
            phone_units: data.quantity, 
            order_date: orderDateOnly, 
            unit_price: unit_price, 
            amount_due_to_logistics_co: amount,
            is_paid_to_logistics_co: false, 
            pickup_location: data.pickupLocation, 
            delivery_location: data.deliveryTo, 
            recipient_name: data.recipientName, 
            company_id: company.company_id,
        };

        try {
            await this.pickupRepository.create(pickup);

            return {
                referenceNo: initialInvoice.reference_number,
                amount: amount.toFixed(2),
                accountNumber: await getLogisticsAccountNumber(),
            };
        } catch (error: any) {
            logger.error('Error creating pickup request:', error);
            throw new AppError('Failed to create pickup request due to a database error.', 500);
        }
    }

    public async getPickupById(id: number): Promise<PickupEntity | null> {
        logger.debug(`Fetching pickup by ID: ${id}`);
        return this.pickupRepository.findById(id);
    }

    public async getPickupByInvoiceReference(invoiceReference: string): Promise<PickupEntity | null> {
        logger.debug(`Fetching pickup by invoice reference: ${invoiceReference}`);
        return this.pickupRepository.findByInvoiceReference(invoiceReference);
    }

    public async getPickupsForCompany(data: GetPickupsRequest): Promise<PickupEntity[]> {
        logger.debug(`Fetching pickups for company: ${data.company_name}${data.status ? ` with status: ${data.status}` : ''}`);

        const company = await this.companyRepository.findByName(data.company_name);
        if (!company) {
            return [];
        }
        const statusEnum = data.status ? (data.status as PickupStatusEnum) : undefined;
        return this.pickupRepository.findByCompanyAndStatus(company.company_id, statusEnum);
    }

    public async markPickupAndInvoiceAsPaid(invoiceReference: string): Promise<PickupEntity> {
        logger.info(`Marking invoice ${invoiceReference} and related pickup as paid.`);

        const pickup = await this.pickupRepository.findByInvoiceReference(invoiceReference);
        if (!pickup) {
            throw new AppError(`Pickup related to Invoice Reference ${invoiceReference} not found.`, 404);
        }
        if (!pickup.invoice) {
            throw new AppError(`Invoice for pickup ${pickup.pickup_id} not found.`, 500);
        }
        if (pickup.invoice.paid && pickup.is_paid_to_logistics_co) {
            logger.warn(`Invoice ${invoiceReference} and Pickup ${pickup.pickup_id} already marked as paid. Idempotent operation.`);
            return pickup;
        }

        await this.pickupRepository.updateInvoiceStatus(pickup.invoice.invoice_id, true);
        logger.info(`Invoice ${pickup.invoice.reference_number} marked as paid.`);

        const paidStatusId = await this.pickupRepository.getPickupStatusId(PickupStatusEnum.PAID_TO_LOGISTICS_CO);
        const updatedPickup = await this.pickupRepository.update(pickup.pickup_id, {
            is_paid_to_logistics_co: true,
            pickup_status_id: paidStatusId
        });

        if (!updatedPickup) {
            throw new AppError(`Failed to update pickup ${pickup.pickup_id} after invoice ${invoiceReference} payment.`, 500);
        }

        logger.info(`Pickup ${updatedPickup.pickup_id} successfully marked as paid and status updated.`);
        return updatedPickup;
    }

    public async updatePickupStatus(pickupId: number, newStatus: PickupStatusEnum): Promise<PickupEntity> {
        logger.info(`Updating status for pickup ${pickupId} to ${newStatus}.`);
        const statusId = await this.pickupRepository.getPickupStatusId(newStatus);
        const updatedPickup = await this.pickupRepository.update(pickupId, { pickup_status_id: statusId });

        if (!updatedPickup) {
            throw new AppError(`Pickup with ID ${pickupId} not found for status update.`, 404);
        }
        logger.info(`Pickup ${pickupId} status updated to ${newStatus}.`);
        return updatedPickup;
    }
}