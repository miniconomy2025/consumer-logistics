import { AnalyticsService } from '../services/analyticsService';
import { IAnalyticsRepository } from '../repositories/interfaces/IAnalyticsRepository';
import { AnalyticsDateRangeService } from '../services/analyticsDateRangeService';
import { TimeManager } from '../services/timeManager';
import { AppError } from '../shared/errors/ApplicationError';

describe('AnalyticsService - critical tests', () => {
  let service: AnalyticsService;
  let repoMock: jest.Mocked<IAnalyticsRepository>;
  let dateRangeMock: jest.Mocked<AnalyticsDateRangeService>;
  let timeManagerMock: jest.Mocked<TimeManager>;

  beforeEach(() => {
    // Mock repository
    repoMock = {
      getTotalRevenue: jest.fn(),
      getTotalPickups: jest.fn(),
      getTotalCompanies: jest.fn(),
      getAverageOrderValue: jest.fn(),
      getPendingPickupsRatio: jest.fn(),
      getCompletionRate: jest.fn(),
      getRevenueGrowth: jest.fn(),
      getPickupGrowth: jest.fn(),
      getCompanyGrowth: jest.fn(),
      getRecentActivity: jest.fn(),
      getTopCompanies: jest.fn(),
      getStatusDistribution: jest.fn(),
      getRevenueTrends: jest.fn(),
      getAveragePickupsPerCompany: jest.fn(),
      getCompanyPerformance: jest.fn(),
    } as unknown as jest.Mocked<IAnalyticsRepository>;

    // Mock date range service
    dateRangeMock = {
      convertRangeToDateStrings: jest.fn(),
      getDefaultRange: jest.fn(),
      getComparisonRange: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsDateRangeService>;

    // Mock TimeManager
    timeManagerMock = {
      getCurrentTime: jest.fn(),
    } as unknown as jest.Mocked<TimeManager>;
    jest.spyOn(TimeManager, 'getInstance').mockReturnValue(timeManagerMock);

    service = new AnalyticsService(repoMock);
    (service as any).dateRangeService = dateRangeMock;
  });

  // -------------------------------
  // 1. categorizeStatus
  // -------------------------------
  it('should categorize statuses correctly', () => {
    const fn = (service as any).categorizeStatus.bind(service);
    expect(fn('Delivered')).toBe('completed');
    expect(fn('Cancelled')).toBe('failed');
    expect(fn('Failed')).toBe('failed');
    expect(fn('Order Received')).toBe('pending');
    expect(fn('Paid To Logistics Co')).toBe('pending');
    expect(fn('Unknown')).toBe('pending');
  });

  // -------------------------------
  // 2. resolveDateRange
  // -------------------------------
  it('should resolve explicit date range', () => {
    const result = (service as any).resolveDateRange({
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
    });
    expect(result).toEqual({ dateFrom: '2025-01-01', dateTo: '2025-01-31' });
  });

  it('should throw AppError for invalid date', () => {
    expect(() =>
      (service as any).resolveDateRange({ dateFrom: 'invalid', dateTo: '2025-01-31' })
    ).toThrow(AppError);
  });

  // -------------------------------
  // 3. getDashboardAnalytics
  // -------------------------------
  it('should return dashboard analytics with derived metrics', async () => {
    // Mock date resolution
    dateRangeMock.convertRangeToDateStrings.mockReturnValue({ dateFrom: '2025-01-01', dateTo: '2025-01-31' });

    // Mock repository responses
    repoMock.getTotalRevenue.mockResolvedValue(1000);
    repoMock.getTotalPickups.mockResolvedValue(50);
    repoMock.getTotalCompanies.mockResolvedValue(10);
    repoMock.getAverageOrderValue.mockResolvedValue(200);
    repoMock.getPendingPickupsRatio.mockResolvedValue(20); // 20%
    repoMock.getCompletionRate.mockResolvedValue(80); // 80%
    repoMock.getRecentActivity.mockResolvedValue([]);
    repoMock.getTopCompanies.mockResolvedValue([]);
    repoMock.getStatusDistribution.mockResolvedValue([]);
    repoMock.getRevenueTrends.mockResolvedValue([]);
    repoMock.getTotalCompanies.mockResolvedValueOnce(10).mockResolvedValueOnce(8); 

    const result = await service.getDashboardAnalytics({});
    expect(result.totalRevenue).toBe(1000);
    expect(result.totalPickups).toBe(50);
    expect(result.pendingPickups).toBe(10); // 20% of 50
    expect(result.completedPickups).toBe(40); // 80% of 50
    expect(result.activeCompanies).toBe(8);
  });

  // -------------------------------
  // 4. getKPIAnalytics
  // -------------------------------
  
  it('should return KPI analytics with growth metrics', async () => {
    const currentTime = new Date('2025-10-01T00:00:00Z');
    timeManagerMock.getCurrentTime.mockReturnValue(currentTime);

    // Mock repository responses
    repoMock.getTotalRevenue.mockResolvedValue(1000);
    repoMock.getTotalPickups.mockResolvedValue(50);
    repoMock.getTotalCompanies.mockResolvedValue(10); 
    repoMock.getAverageOrderValue.mockResolvedValue(200);
    repoMock.getPendingPickupsRatio.mockResolvedValue(20); 
    repoMock.getCompletionRate.mockResolvedValue(80); 
    repoMock.getAveragePickupsPerCompany.mockResolvedValue(5);

    repoMock.getCompanyPerformance.mockResolvedValue([
      {
        companyId: 1,
        companyName: 'Test Company',
        totalRevenue: 1000,
        totalPickups: 10,
        averageOrderValue: 100,
        firstPickupDate: new Date('2025-01-05'),
        lastPickupDate: new Date('2025-01-20'), 
      },
    ]);


    // Mock total vs active companies (totalCompanies = 10, activeCompanies = 10)
    repoMock.getTotalCompanies.mockResolvedValueOnce(10).mockResolvedValueOnce(10);

    // Mock date range resolution
    dateRangeMock.convertRangeToDateStrings.mockReturnValue({ dateFrom: '2025-01-01', dateTo: '2025-01-31' });

    const result = await service.getKPIAnalytics({});

    expect(result.totalRevenue).toBe(1000);
    expect(result.totalPickups).toBe(50);
    expect(result.averagePickupsPerCompany).toBe(5);
    expect(result.newCompanies).toBe(1); // firstPickupDate falls in range
    expect(result.companyRetentionRate).toBe(100); // activeCompanies / totalCompanies * 100
    expect(result.periodStart).toBe('2025-01-01');
    expect(result.periodEnd).toBe('2025-01-31');
  });
});
