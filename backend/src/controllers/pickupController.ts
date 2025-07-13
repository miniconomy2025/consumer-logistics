import { Request, Response, NextFunction } from 'express';
import { PickupService } from '../services/pickupService';
import { AppError } from '../shared/errors/ApplicationError';
import { CreatePickupRequest, PickupResponse, ListPickupResponse, GetPickupsRequest } from '../types/dtos/pickupDtos'; 

export class PickupController {
    private pickupService: PickupService;

    constructor(
        pickupService: PickupService 
    ) {
        this.pickupService = pickupService;
    }

    public createPickup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const companyName = (req as any).clientName as string;
            const quantity = req.body.quantity;

            if (!companyName || typeof quantity !== 'number') {
                throw new AppError('Invalid request: companyName and a numeric quantity are required.', 400);
            }

            const pickupRequest: CreatePickupRequest = {
                companyName,
                quantity,
            };

            const result: PickupResponse = await this.pickupService.createPickupRequest(pickupRequest);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };
    

    public getPickupsForCompany = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data: GetPickupsRequest = {
                company_name: req.query.company_name as string,
                status: req.query.status as string | undefined,
            };

            if (typeof data.company_name !== 'string' || !data.company_name) {
                throw new AppError('Company name (string) is required to list pickups.', 400);
            }

            const pickups = await this.pickupService.getPickupsForCompany(data);

            const response: ListPickupResponse[] = pickups.map(p => ({
                id: p.pickup_id,
                quantity: p.phone_units,
                company_name: p.company ? p.company.company_name : 'Unknown', 
                status: p.pickup_status ? p.pickup_status.status_name : 'Unknown',
                recipient_name: p.recipient_name,
                model_name: p.model_name, // Added model_name to the response mapping
                amount_due: parseFloat(p.invoice.total_amount.toString()),
                is_paid: p.invoice?.paid || false,
            }));

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };
}