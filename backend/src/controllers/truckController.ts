import { Request, Response, NextFunction } from 'express';
import { TruckManagementService } from '../services/truckManagementService';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';
import {
    CreateTruckRequest,
    UpdateTruckRequest,
    TruckResponse,
    TrucksListResponse,
    CreateTruckTypeRequest,
    TruckTypeResponse,
    TruckTypesListResponse,
    CreateTrucksResponse,
} from '../types/dtos/TruckDtos';
import { TimeManager } from '../services/timeManager';


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
    public bulkBreakdown = async (req: Request, res: Response, next: NextFunction) => {
        try {
        const { truckName, failureQuantity } = req.body;
    
        if (!truckName || typeof truckName !== 'string' || typeof failureQuantity !== 'number' || failureQuantity <= 0) {
            throw new AppError('Invalid truckTypeName or count provided', 400);
        }
    
        const affected = await this.truckManagementService.breakdownTrucksByType(truckName, failureQuantity);

        const timeManager = TimeManager.getInstance();
        
        // Get current simulation time
        const currentSimTime = timeManager.getCurrentTime();
        
        // Calculate restoration time 
        const restorationTime = new Date(currentSimTime.getTime() + (24 *60 * 60 * 1000));
        
        // Log the scheduled restoration
        logger.info(`Scheduling restoration of ${truckName} trucks at simulation time: ${restorationTime.toISOString()}`);
        
        // Set an interval to check if the simulation time has reached the restoration time
        const checkInterval = setInterval(() => {
            const now = timeManager.getCurrentTime();
            if (now.getTime() >= restorationTime.getTime()) {
                clearInterval(checkInterval);
                // Restore the trucks
                this.truckManagementService.restoreTrucksByType(truckName)
                    .then(restoredCount => {
                        logger.info(`Restored ${restoredCount} truck(s) of type '${truckName}' after 2 minutes of simulation time.`);
                    })
                    .catch(error => {
                        logger.error(`Failed to restore trucks of type '${truckName}':`, error);
                    });
            }
        }, 1000); // Check every second
    
        res.status(200).json({
            message: `${affected} truck(s) of type '${truckName}' marked as unavailable.`,
        });
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
            const quantity = data.quantity ?? 1;

            if (quantity <= 0) {
                throw new AppError('Quantity must be a positive number', 400);
            }

            const createdTrucks = await this.truckManagementService.createTruck(data);

            const response: CreateTrucksResponse = {
                message: `Successfully created ${createdTrucks.length} truck(s).`,
                quantityCreated: createdTrucks.length,
                trucks: createdTrucks.map(truck => ({
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
                }))
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