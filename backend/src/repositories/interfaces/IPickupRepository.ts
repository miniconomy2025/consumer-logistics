import { PickupEntity, PickupStatusEnum } from '../../database/models/PickupEntity'; 
import { InvoiceEntity } from '../../database/models/InvoiceEntity'; 

export interface IPickupRepository {
    create(data: Partial<PickupEntity>): Promise<PickupEntity>;
    findById(id: number): Promise<PickupEntity | null>;
    findByInvoiceReference(invoiceReference: string): Promise<PickupEntity | null>;
    findByCompanyAndStatus(companyId: number, statusName?: PickupStatusEnum): Promise<PickupEntity[]>;
    update(id: number, data: Partial<PickupEntity>): Promise<PickupEntity | null>;
    getPickupStatusId(statusName: PickupStatusEnum): Promise<number>;
    updateInvoiceStatus(invoiceId: number, paid: boolean): Promise<InvoiceEntity | null>;
    createInvoice(data: Partial<InvoiceEntity>): Promise<InvoiceEntity>;
}