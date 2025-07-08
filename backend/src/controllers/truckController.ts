import { Request, Response, NextFunction } from 'express';
import { TruckManagementService } from '../services/truckManagementService';
import { AppError } from '../shared/errors/ApplicationError';
import {
    CreateTruckRequest,
    UpdateTruckRequest,
    TruckResponse,
    TrucksListResponse,
    CreateTruckTypeRequest,
    TruckTypeResponse,
    TruckTypesListResponse,
} from '../types/dtos/TruckDtos';


export class TruckController {
    private truckManagementService: TruckManagementService;

    constructor(
        truckManagementService: TruckManagementService,
    ) {
        this.truckManagementService = truckManagementService;
    }

    public createTruckType = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data: CreateTruckTypeRequest = req.body;
            const newTruckType = await this.truckManagementService.createTruckType(data);
            const response: TruckTypeResponse = {
                truckTypeId: newTruckType.truck_type_id,
                truckTypeName: newTruckType.truck_type_name,
            };
            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    };

    public getTruckTypeById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const typeId = parseInt(req.params.id, 10);
            if (isNaN(typeId)) {
                throw new AppError('Invalid truck type ID provided', 400);
            }
            const truckType = await this.truckManagementService.getTruckTypeById(typeId);
            if (!truckType) {
                throw new AppError('Truck type not found', 404);
            }
            const response: TruckTypeResponse = {
                truckTypeId: truckType.truck_type_id,
                truckTypeName: truckType.truck_type_name,
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    public getAllTruckTypes = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const truckTypes = await this.truckManagementService.getAllTruckTypes();
            const response: TruckTypesListResponse = {
                message: 'Successfully retrieved all truck types.',
                totalCount: truckTypes.length,
                truckTypes: truckTypes.map(type => ({
                    truckTypeId: type.truck_type_id,
                    truckTypeName: type.truck_type_name,
                })),
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    public deleteTruckType = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const typeId = parseInt(req.params.id, 10);
            if (isNaN(typeId)) {
                throw new AppError('Invalid truck type ID provided', 400);
            }
            const deleted = await this.truckManagementService.deleteTruckType(typeId);
            if (!deleted) {
                throw new AppError('Truck type not found for deletion', 404);
            }
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    public createTruck = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data: CreateTruckRequest = req.body;
            const newTruck = await this.truckManagementService.createTruck(data);
            const response: TruckResponse = {
                truckId: newTruck.truck_id,
                truckTypeId: newTruck.truck_type_id,
                truckType: {
                    truckTypeId: newTruck.truckType.truck_type_id,
                    truckTypeName: newTruck.truckType.truck_type_name,
                },
                maxPickups: newTruck.max_pickups,
                maxDropoffs: newTruck.max_dropoffs,
                dailyOperatingCost: newTruck.daily_operating_cost,
                maxCapacity: newTruck.max_capacity,
                isAvailable: newTruck.is_available, 
            };
            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    };

    public getTruckById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const truckId = parseInt(req.params.id, 10);
            if (isNaN(truckId)) {
                throw new AppError('Invalid truck ID provided', 400);
            }
            const truck = await this.truckManagementService.getTruckById(truckId);
            if (!truck) {
                throw new AppError('Truck not found', 404);
            }
            const response: TruckResponse = {
                truckId: truck.truck_id,
                truckTypeId: truck.truck_type_id,
                truckType: {
                    truckTypeId: truck.truckType.truck_type_id,
                    truckTypeName: truck.truckType.truck_type_name,
                },
                maxPickups: truck.max_pickups,
                maxDropoffs: truck.max_dropoffs,
                dailyOperatingCost: truck.daily_operating_cost,
                maxCapacity: truck.max_capacity,
                isAvailable: truck.is_available,
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    public getAllTrucks = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const trucks = await this.truckManagementService.getAllTrucks();
            const response: TrucksListResponse = {
                message: 'Successfully retrieved all trucks.',
                totalCount: trucks.length,
                trucks: trucks.map(truck => ({
                    truckId: truck.truck_id,
                    truckTypeId: truck.truck_type_id,
                    truckType: {
                        truckTypeId: truck.truckType.truck_type_id,
                        truckTypeName: truck.truckType.truck_type_name,
                    },
                    maxPickups: truck.max_pickups,
                    maxDropoffs: truck.max_dropoffs,
                    dailyOperatingCost: truck.daily_operating_cost,
                    maxCapacity: truck.max_capacity,
                    isAvailable: truck.is_available, 
                })),
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    public updateTruck = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const truckId = parseInt(req.params.id, 10);
            if (isNaN(truckId)) {
                throw new AppError('Invalid truck ID provided', 400);
            }
            const data: UpdateTruckRequest = req.body;

            const updatePayloadForService: Partial<CreateTruckRequest & { is_available?: boolean }> = {
                truckTypeId: data.truckTypeId,
                maxPickups: data.maxPickups,
                maxDropoffs: data.maxDropoffs,
                dailyOperatingCost: data.dailyOperatingCost,
                maxCapacity: data.maxCapacity,
            };

            if (typeof data.isAvailable === 'boolean') {
                updatePayloadForService.isAvailable = data.isAvailable; 
            }

            const updatedTruck = await this.truckManagementService.updateTruck(truckId, updatePayloadForService); 
            
            if (!updatedTruck) {
                throw new AppError('Truck not found for update', 404);
            }
            const response: TruckResponse = {
                truckId: updatedTruck.truck_id,
                truckTypeId: updatedTruck.truck_type_id,
                truckType: {
                    truckTypeId: updatedTruck.truckType.truck_type_id,
                    truckTypeName: updatedTruck.truckType.truck_type_name,
                },
                maxPickups: updatedTruck.max_pickups,
                maxDropoffs: updatedTruck.max_dropoffs,
                dailyOperatingCost: updatedTruck.daily_operating_cost,
                maxCapacity: updatedTruck.max_capacity,
                isAvailable: updatedTruck.is_available, // ADDED: include is_available in response
            };
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    public deleteTruck = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const truckId = parseInt(req.params.id, 10);
            if (isNaN(truckId)) {
                throw new AppError('Invalid truck ID provided', 400);
            }
            const deleted = await this.truckManagementService.deleteTruck(truckId);
            if (!deleted) {
                throw new AppError('Truck not found for deletion', 404);
            }
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}