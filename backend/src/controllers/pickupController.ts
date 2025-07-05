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

    public createPickup = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data: CreatePickupRequest = req.body;
            if (
                typeof data.quantity !== 'number' ||
                !data.pickupFrom ||
                !data.deliveryTo ||
                !data.pickupLocation || 
                !data.recipientName 
            ) {
                throw new AppError('Invalid request body: pickupFrom, quantity, deliveryTo, pickupLocation, and recipientName are required.', 400);
            }
            const result: PickupResponse = await this.pickupService.createPickupRequest(data);
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
                pickup_location: p.pickup_location,
                delivery_location: p.delivery_location,
                recipient_name: p.recipient_name,
                amount_due: parseFloat(p.amount_due_to_logistics_co.toString()),
                is_paid: p.is_paid_to_logistics_co,
            }));

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };
}