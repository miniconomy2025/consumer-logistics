import { Request, Response, NextFunction } from 'express';
import { PickupService } from '../services/pickupRequestService';
import { PickupManagementService } from '../services/pickupManagementService';
import { PickupRepository } from '../repositories/implementations/PickupRepository';
import { AppError } from '../shared/errors/ApplicationError';
import {
  CreatePickupRequest,
  PickupCreationResponse,
  PickupResponse,
  UpdatePickupRequest,
  PickupsListResponse,
  PickupSearchParams,
  PickupStatusResponse,
  PickupAnalyticsResponse,
} from '../types/dtos/pickupDtos';

export class PickupController {
  private pickupService: PickupService;
  private pickupManagementService: PickupManagementService;

  constructor(
    pickupService: PickupService = new PickupService(new PickupRepository()),
    pickupManagementService: PickupManagementService = new PickupManagementService()
  ) {
    this.pickupService = pickupService;
    this.pickupManagementService = pickupManagementService;
  }

  // --- Pickup Creation (Existing Endpoint) ---

  public createPickup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreatePickupRequest = req.body;
      if (
        typeof data.quantity !== 'number' ||
        !data.pickupFrom ||
        !data.deliveryTo
      ) {
        throw new AppError('Invalid request body: pickupFrom, quantity, and deliveryTo are required.', 400);
      }
      const result: PickupCreationResponse = await this.pickupService.createPickupRequest(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  // --- Pickup CRUD Operations (New Endpoints) ---

  public getPickupById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pickupId = parseInt(req.params.id, 10);
      if (isNaN(pickupId)) {
        throw new AppError('Invalid pickup ID provided', 400);
      }

      const pickup = await this.pickupManagementService.getPickupById(pickupId);

      if (!pickup) {
        throw new AppError('Pickup not found', 404);
      }

      const response: PickupResponse = {
        pickupId: pickup.pickupId,
        invoiceId: pickup.invoiceId,
        companyId: pickup.companyId,
        pickupStatusId: pickup.pickupStatusId,
        pickupDate: pickup.pickupDate,
        unitPrice: pickup.unitPrice,
        customer: pickup.customer,
        pickupStatus: pickup.pickupStatus,
        company: pickup.company,
        invoice: pickup.invoice,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getAllPickups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params: PickupSearchParams = {
        companyId: req.query.companyId ? parseInt(req.query.companyId as string) : undefined,
        pickupStatusId: req.query.pickupStatusId ? parseInt(req.query.pickupStatusId as string) : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        customer: req.query.customer as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await this.pickupManagementService.getAllPickups(params);

      const response: PickupsListResponse = {
        message: 'Successfully retrieved pickups.',
        totalCount: result.totalCount,
        pickups: result.pickups.map(pickup => ({
          pickupId: pickup.pickupId,
          invoiceId: pickup.invoiceId,
          companyId: pickup.companyId,
          pickupStatusId: pickup.pickupStatusId,
          pickupDate: pickup.pickupDate,
          unitPrice: pickup.unitPrice,
          customer: pickup.customer,
          pickupStatus: pickup.pickupStatus,
          company: pickup.company,
          invoice: pickup.invoice,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updatePickup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pickupId = parseInt(req.params.id, 10);
      if (isNaN(pickupId)) {
        throw new AppError('Invalid pickup ID provided', 400);
      }

      const data: UpdatePickupRequest = req.body;

      const updatedPickup = await this.pickupManagementService.updatePickup(pickupId, {
        companyId: data.companyId,
        pickupStatusId: data.pickupStatusId,
        pickupDate: data.pickupDate,
        unitPrice: data.unitPrice,
        customer: data.customer,
        invoiceId: data.invoiceId,
      });

      if (!updatedPickup) {
        throw new AppError('Pickup not found', 404);
      }

      const response: PickupResponse = {
        pickupId: updatedPickup.pickupId,
        invoiceId: updatedPickup.invoiceId,
        companyId: updatedPickup.companyId,
        pickupStatusId: updatedPickup.pickupStatusId,
        pickupDate: updatedPickup.pickupDate,
        unitPrice: updatedPickup.unitPrice,
        customer: updatedPickup.customer,
        pickupStatus: updatedPickup.pickupStatus,
        company: updatedPickup.company,
        invoice: updatedPickup.invoice,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  public deletePickup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pickupId = parseInt(req.params.id, 10);
      if (isNaN(pickupId)) {
        throw new AppError('Invalid pickup ID provided', 400);
      }

      const deleted = await this.pickupManagementService.deletePickup(pickupId);

      if (!deleted) {
        throw new AppError('Pickup not found', 404);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // --- Search and Analytics Endpoints ---

  public searchPickups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params: PickupSearchParams = {
        companyId: req.query.companyId ? parseInt(req.query.companyId as string) : undefined,
        pickupStatusId: req.query.pickupStatusId ? parseInt(req.query.pickupStatusId as string) : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        customer: req.query.customer as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await this.pickupManagementService.searchPickups(params);

      const response: PickupsListResponse = {
        message: `Found ${result.totalCount} pickups matching search criteria.`,
        totalCount: result.totalCount,
        pickups: result.pickups.map(pickup => ({
          pickupId: pickup.pickupId,
          invoiceId: pickup.invoiceId,
          companyId: pickup.companyId,
          pickupStatusId: pickup.pickupStatusId,
          pickupDate: pickup.pickupDate,
          unitPrice: pickup.unitPrice,
          customer: pickup.customer,
          pickupStatus: pickup.pickupStatus,
          company: pickup.company,
          invoice: pickup.invoice,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getRecentPickups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      if (limit <= 0 || limit > 100) {
        throw new AppError('Limit must be between 1 and 100', 400);
      }

      const pickups = await this.pickupManagementService.getRecentPickups(limit);

      const response = pickups.map(pickup => ({
        pickupId: pickup.pickupId,
        invoiceId: pickup.invoiceId,
        companyId: pickup.companyId,
        pickupStatusId: pickup.pickupStatusId,
        pickupDate: pickup.pickupDate,
        unitPrice: pickup.unitPrice,
        customer: pickup.customer,
        pickupStatus: pickup.pickupStatus,
        company: pickup.company,
        invoice: pickup.invoice,
      }));

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getPendingPickups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pickups = await this.pickupManagementService.getPendingPickups();

      const response = pickups.map(pickup => ({
        pickupId: pickup.pickupId,
        invoiceId: pickup.invoiceId,
        companyId: pickup.companyId,
        pickupStatusId: pickup.pickupStatusId,
        pickupDate: pickup.pickupDate,
        unitPrice: pickup.unitPrice,
        customer: pickup.customer,
        pickupStatus: pickup.pickupStatus,
        company: pickup.company,
        invoice: pickup.invoice,
      }));

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getPickupAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const analytics = await this.pickupManagementService.getPickupAnalytics(dateFrom, dateTo);

      res.status(200).json(analytics);
    } catch (error) {
      next(error);
    }
  };

  public getPickupStatuses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statuses = await this.pickupManagementService.getPickupStatuses();

      res.status(200).json(statuses);
    } catch (error) {
      next(error);
    }
  };
}