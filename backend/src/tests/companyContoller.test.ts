import { Request, Response, NextFunction } from 'express';
import { CompanyController } from '../controllers/companycontroller';
import { CompanyService } from '../services/companyService';
import { CompanyEntity } from '../database/models/CompanyEntity';

jest.mock('../utils/logger');

describe('CompanyController', () => {
  let controller: CompanyController;
  let mockService: jest.Mocked<CompanyService>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const mockCompany: Partial<CompanyEntity> = {
    company_id: 1,
    company_name: 'pear-company',
    bank_account_id: 'bank-123'
  };

  beforeEach(() => {
    mockService = {
      registerCompany: jest.fn(),
      getAllCompanies: jest.fn(),
    } as any;

    controller = new CompanyController(mockService as any);
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    req = { body: {}, params: {} };
    next = jest.fn();
  });

  describe('registerCompany', () => {
    it('should register a company when clientName provided', async () => {
      (req as any).clientName = 'SomeClient';
      req.body = { bank_account_id: 'bank-123' };
      mockService.registerCompany.mockResolvedValue(mockCompany as CompanyEntity);

      await controller.registerCompany(req as Request, res as Response, next);

      expect(mockService.registerCompany).toHaveBeenCalledWith('someclient', 'bank-123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 1, company_name: 'pear-company', bank_account_id: 'bank-123' });
    });

    it('should return 400 when clientName missing', async () => {
      // no clientName set on req
      req.body = { bank_account_id: 'bank-123' };

      await controller.registerCompany(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });

  describe('getAllCompanies', () => {
    it('should return 403 when client is not consumer-logistics', async () => {
      (req as any).clientName = 'other-client';

      await controller.getAllCompanies(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });

    it('should return list of companies when client is consumer-logistics', async () => {
      (req as any).clientName = 'consumer-logistics';
      mockService.getAllCompanies.mockResolvedValue([mockCompany as CompanyEntity]);

      await controller.getAllCompanies(req as Request, res as Response, next);

      expect(mockService.getAllCompanies).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
    });
  });
});
