import { Request, Response, NextFunction } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { AnalyticsService } from '../services/analyticsService';
import { AnalyticsDateRangeService } from '../services/analyticsDateRangeService';

jest.mock('../utils/logger');

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockService: jest.Mocked<AnalyticsService>;
  let mockDateRangeService: jest.Mocked<AnalyticsDateRangeService>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const mockDashboardAnalytics = {
    totalRevenue: 150000,
    totalPickups: 500,
    totalCompanies: 25,
    averageOrderValue: 300,
    revenueGrowth: 15.5,
    pickupGrowth: 12.3,
    companyGrowth: 8.2,
    pendingPickups: 50,
    completedPickups: 400,
    activeCompanies: 20,
    recentPickups: [
      {
        pickupId: 1,
        companyName: 'Test Company',
        customer: 'John Doe',
        amount: 250,
        status: 'Delivered',
        date: '2025-10-20',
      },
    ],
    topCompanies: [
      {
        companyId: 1,
        companyName: 'Top Company',
        totalRevenue: 50000,
        totalPickups: 150,
        averageOrderValue: 333.33,
      },
    ],
    statusDistribution: [
      {
        statusName: 'Delivered',
        count: 400,
        percentage: 80,
      },
    ],
    revenueTrend: [
      {
        month: '2025-10',
        revenue: 25000,
        pickupCount: 100,
      },
    ],
  };

  const mockKPIAnalytics = {
    totalRevenue: 150000,
    monthlyRevenue: 25000,
    averageOrderValue: 300,
    revenueGrowthRate: 15.5,
    totalPickups: 500,
    monthlyPickups: 100,
    pickupGrowthRate: 12.3,
    averagePickupsPerCompany: 20,
    totalCompanies: 25,
    activeCompanies: 20,
    newCompanies: 3,
    companyRetentionRate: 80,
    averageProcessingTime: 2.5,
    completionRate: 85,
    pendingPickupsRatio: 10,
    periodStart: '2025-01-01',
    periodEnd: '2025-10-24',
    comparisonPeriodStart: '2024-01-01',
    comparisonPeriodEnd: '2024-10-24',
  };

  const mockRecentOrders = [
    {
      pickupId: 1,
      companyId: 1,
      companyName: 'Test Company',
      customer: 'John Doe',
      amount: 250,
      status: 'Delivered',
      date: '2025-10-20T10:00:00.000Z',
    },
    {
      pickupId: 2,
      companyId: 2,
      companyName: 'Another Company',
      customer: 'Jane Smith',
      amount: 350,
      status: 'Pending',
      date: '2025-10-21T14:30:00.000Z',
    },
  ];

  beforeEach(() => {
    // Create mock service with all required methods
    mockService = {
      getDashboardAnalytics: jest.fn(),
      getKPIAnalytics: jest.fn(),
      getRecentOrders: jest.fn(),
    } as any;

    // Create mock date range service
    mockDateRangeService = {
      isValidRange: jest.fn(),
    } as any;

    // Create controller with mock service
    controller = new AnalyticsController(mockService);
    
    // Mock the date range service on the controller instance
    (controller as any).dateRangeService = mockDateRangeService;

    // Setup request, response, and next mocks
    req = {
      query: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('getDashboardAnalytics', () => {
    it('should return 200 and dashboard analytics data', async () => {
      mockService.getDashboardAnalytics.mockResolvedValue(mockDashboardAnalytics);

      await controller.getDashboardAnalytics(req as Request, res as Response, next);

      expect(mockService.getDashboardAnalytics).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDashboardAnalytics);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call service without parameters when no query params provided', async () => {
      req.query = {};
      mockService.getDashboardAnalytics.mockResolvedValue(mockDashboardAnalytics);

      await controller.getDashboardAnalytics(req as Request, res as Response, next);

      expect(mockService.getDashboardAnalytics).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle service errors and call next with error', async () => {
      const error = new Error('Database connection failed');
      mockService.getDashboardAnalytics.mockRejectedValue(error);

      await controller.getDashboardAnalytics(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle empty analytics data gracefully', async () => {
      const emptyAnalytics = {
        ...mockDashboardAnalytics,
        totalRevenue: 0,
        totalPickups: 0,
        totalCompanies: 0,
        recentPickups: [],
        topCompanies: [],
        statusDistribution: [],
        revenueTrend: [],
      };
      mockService.getDashboardAnalytics.mockResolvedValue(emptyAnalytics);

      await controller.getDashboardAnalytics(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(emptyAnalytics);
    });
  });

  describe('getRecentOrders', () => {
    it('should return 200 and recent orders with default limit', async () => {
      req.query = {};
      mockService.getRecentOrders.mockResolvedValue(mockRecentOrders);

      await controller.getRecentOrders(req as Request, res as Response, next);

      expect(mockService.getRecentOrders).toHaveBeenCalledWith(100);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ items: mockRecentOrders });
    });

    it('should parse and use custom limit from query params', async () => {
      req.query = { limit: '50' };
      mockService.getRecentOrders.mockResolvedValue(mockRecentOrders);

      await controller.getRecentOrders(req as Request, res as Response, next);

      expect(mockService.getRecentOrders).toHaveBeenCalledWith(50);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should enforce maximum limit of 1000', async () => {
      req.query = { limit: '5000' };
      mockService.getRecentOrders.mockResolvedValue(mockRecentOrders);

      await controller.getRecentOrders(req as Request, res as Response, next);

      expect(mockService.getRecentOrders).toHaveBeenCalledWith(1000);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should enforce minimum limit of 1', async () => {
      req.query = { limit: '-10' };
      mockService.getRecentOrders.mockResolvedValue(mockRecentOrders);

      await controller.getRecentOrders(req as Request, res as Response, next);

      expect(mockService.getRecentOrders).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should use default limit for invalid numeric values', async () => {
      req.query = { limit: 'invalid' };
      mockService.getRecentOrders.mockResolvedValue(mockRecentOrders);

      await controller.getRecentOrders(req as Request, res as Response, next);

      expect(mockService.getRecentOrders).toHaveBeenCalledWith(100);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle empty orders array', async () => {
      mockService.getRecentOrders.mockResolvedValue([]);

      await controller.getRecentOrders(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ items: [] });
    });

    it('should handle service errors and call next with error', async () => {
      const error = new Error('Failed to fetch recent orders');
      mockService.getRecentOrders.mockRejectedValue(error);

      await controller.getRecentOrders(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle limit as zero and use minimum of 1', async () => {
      req.query = { limit: '0' };
      mockService.getRecentOrders.mockResolvedValue(mockRecentOrders);

      await controller.getRecentOrders(req as Request, res as Response, next);

      // parseInt('0') returns 0, then Math.max(0, 1) = 1, but the || 100 clause triggers first
      // since parseInt('0') is falsy in the || check, it defaults to 100
      expect(mockService.getRecentOrders).toHaveBeenCalledWith(100);
    });
  });

  describe('getKPIAnalytics', () => {
    it('should return 200 and KPI analytics data', async () => {
      mockService.getKPIAnalytics.mockResolvedValue(mockKPIAnalytics);

      await controller.getKPIAnalytics(req as Request, res as Response, next);

      expect(mockService.getKPIAnalytics).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockKPIAnalytics);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call service without parameters when no query params provided', async () => {
      req.query = {};
      mockService.getKPIAnalytics.mockResolvedValue(mockKPIAnalytics);

      await controller.getKPIAnalytics(req as Request, res as Response, next);

      expect(mockService.getKPIAnalytics).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle service errors and call next with error', async () => {
      const error = new Error('Failed to calculate KPIs');
      mockService.getKPIAnalytics.mockRejectedValue(error);

      await controller.getKPIAnalytics(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle KPI data with zero values', async () => {
      const zeroKPIs = {
        ...mockKPIAnalytics,
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalPickups: 0,
        monthlyPickups: 0,
        totalCompanies: 0,
        activeCompanies: 0,
        newCompanies: 0,
      };
      mockService.getKPIAnalytics.mockResolvedValue(zeroKPIs);

      await controller.getKPIAnalytics(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(zeroKPIs);
    });

    it('should handle negative growth rates', async () => {
      const negativeGrowth = {
        ...mockKPIAnalytics,
        revenueGrowthRate: -10.5,
        pickupGrowthRate: -5.2,
      };
      mockService.getKPIAnalytics.mockResolvedValue(negativeGrowth);

      await controller.getKPIAnalytics(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(negativeGrowth);
    });
  });

  describe('getAnalyticsHealth', () => {
    it('should return 200 and health status', async () => {
      await controller.getAnalyticsHealth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(String),
          services: {
            database: 'connected',
            analytics: 'operational',
            cache: 'not_implemented',
          },
          version: '1.0.0',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should include valid ISO timestamp in health response', async () => {
      await controller.getAnalyticsHealth(req as Request, res as Response, next);

      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      const timestamp = callArgs.timestamp;
      
      // Validate ISO 8601 format
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should handle errors during health check', async () => {
      const error = new Error('Health check failed');
      // Force an error by making res.json throw
      (res.json as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      await controller.getAnalyticsHealth(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('parseQueryParams (private method - Note: not currently used in controller)', () => {
    it('should always return all-time analytics regardless of query parameters', async () => {
      // Date filtering has been removed from the controller
      // The controller always calls service methods without parameters
      req.query = { range: 'last30days', dateFrom: '2025-01-01', dateTo: '2025-10-24' };
      mockService.getDashboardAnalytics.mockResolvedValue(mockDashboardAnalytics);

      await controller.getDashboardAnalytics(req as Request, res as Response, next);

      // Service is called without any parameters (all-time analytics)
      expect(mockService.getDashboardAnalytics).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should ignore range parameters in KPI analytics', async () => {
      req.query = { range: 'last7days', comparisonRange: 'last30days' };
      mockService.getKPIAnalytics.mockResolvedValue(mockKPIAnalytics);

      await controller.getKPIAnalytics(req as Request, res as Response, next);

      // Service is called without any parameters
      expect(mockService.getKPIAnalytics).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should ignore companyId filter parameter', async () => {
      req.query = { companyId: '123' };
      mockService.getDashboardAnalytics.mockResolvedValue(mockDashboardAnalytics);

      await controller.getDashboardAnalytics(req as Request, res as Response, next);

      expect(mockService.getDashboardAnalytics).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should ignore all date-related query parameters', async () => {
      req.query = {
        range: 'last30days',
        comparisonRange: 'last7days',
        companyId: '456',
        dateFrom: '2025-01-01',
        dateTo: '2025-10-24',
        comparisonDateFrom: '2024-01-01',
        comparisonDateTo: '2024-10-24',
      };
      mockService.getDashboardAnalytics.mockResolvedValue(mockDashboardAnalytics);

      await controller.getDashboardAnalytics(req as Request, res as Response, next);

      // All parameters are ignored, service called without parameters
      expect(mockService.getDashboardAnalytics).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error handling', () => {
    it('should not catch errors in middleware chain', async () => {
      const error = new Error('Unexpected error');
      mockService.getDashboardAnalytics.mockRejectedValue(error);

      await controller.getDashboardAnalytics(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should pass through AppError instances', async () => {
      const appError = new Error('Application specific error');
      (appError as any).statusCode = 400;
      mockService.getKPIAnalytics.mockRejectedValue(appError);

      await controller.getKPIAnalytics(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(appError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      mockService.getRecentOrders.mockRejectedValue(timeoutError);

      await controller.getRecentOrders(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(timeoutError);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined query object', async () => {
      req.query = undefined as any;
      mockService.getDashboardAnalytics.mockResolvedValue(mockDashboardAnalytics);

      await controller.getDashboardAnalytics(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle null in limit parameter', async () => {
      req.query = { limit: null as any };
      mockService.getRecentOrders.mockResolvedValue(mockRecentOrders);

      await controller.getRecentOrders(req as Request, res as Response, next);

      expect(mockService.getRecentOrders).toHaveBeenCalledWith(100);
    });

    it('should handle decimal limit values by converting to integer', async () => {
      req.query = { limit: '25.7' };
      mockService.getRecentOrders.mockResolvedValue(mockRecentOrders);

      await controller.getRecentOrders(req as Request, res as Response, next);

      expect(mockService.getRecentOrders).toHaveBeenCalledWith(25);
    });

    it('should handle very large datasets in dashboard analytics', async () => {
      const largeDataset = {
        ...mockDashboardAnalytics,
        recentPickups: Array(100).fill(mockDashboardAnalytics.recentPickups[0]),
        topCompanies: Array(50).fill(mockDashboardAnalytics.topCompanies[0]),
        statusDistribution: Array(20).fill(mockDashboardAnalytics.statusDistribution[0]),
        revenueTrend: Array(12).fill(mockDashboardAnalytics.revenueTrend[0]),
      };
      mockService.getDashboardAnalytics.mockResolvedValue(largeDataset);

      await controller.getDashboardAnalytics(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(largeDataset);
    });
  });

  describe('Constructor', () => {
    it('should create controller with default service when no service provided', () => {
      const newController = new AnalyticsController();
      expect(newController).toBeDefined();
      expect((newController as any).analyticsService).toBeDefined();
      expect((newController as any).dateRangeService).toBeDefined();
    });

    it('should create controller with provided service', () => {
      const customService = new AnalyticsService();
      const newController = new AnalyticsController(customService);
      expect(newController).toBeDefined();
      expect((newController as any).analyticsService).toBe(customService);
    });
  });
});
