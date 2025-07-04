// API Response Types

// ============================================================================
// COMPANY TYPES
// ============================================================================

export interface CompanyResponse {
  companyId: number;
  companyName: string;
}

export interface CompanyWithStatsResponse extends CompanyResponse {
  totalPickups: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastPickupDate: string | null;
}

export interface CompaniesListResponse {
  message: string;
  totalCount: number;
  companies: CompanyResponse[];
}

export interface CreateCompanyRequest extends Record<string, unknown> {
  companyName: string;
}

export interface UpdateCompanyRequest extends Record<string, unknown> {
  companyName?: string;
}

export interface CompanyPerformanceResponse {
  companyId: number;
  companyName: string;
  totalRevenue: number;
  totalPickups: number;
  averageOrderValue: number;
  revenueGrowth: number;
  pickupGrowth: number;
  lastPickupDate: string | null;
  performanceScore: number;
  rank: number;
}

// ============================================================================
// PICKUP TYPES
// ============================================================================

// Updated to match actual backend PickupEntity schema
export interface PickupResponse {
  pickupId: number;           // pickup_id
  invoiceId: number;          // invoice_id
  companyId: number;          // company_id
  pickupStatusId: number;     // pickup_status_id
  pickupDate: string | null;  // pickup_date (can be null)
  unitPrice: number;          // unit_price
  customer: string;           // customer
  // Optional populated relationships
  pickupStatus?: {
    pickupStatusId: number;
    statusName: string;       // status_name from PickupStatusEntity
  };
  company?: {
    companyId: number;
    companyName: string;      // company_name from CompanyEntity
  };
  invoice?: {
    invoiceId: number;
    referenceNumber: string;  // reference_number from InvoiceEntity
    totalAmount: number;      // total_amount from InvoiceEntity
    paid: boolean;            // paid from InvoiceEntity
  };
}

// Backend expects: { pickupFrom: string, quantity: number, deliveryTo: string }
export interface CreatePickupRequest extends Record<string, unknown> {
  pickupFrom: string;         // Maps to company lookup
  quantity: number;           // Maps to some quantity field
  deliveryTo: string;         // Maps to customer field
}

// For future use when backend CRUD operations are implemented
export interface UpdatePickupRequest extends Record<string, unknown> {
  companyId?: number;
  pickupStatusId?: number;
  pickupDate?: string;
  unitPrice?: number;
  customer?: string;
  invoiceId?: number;
}

export interface PickupsListResponse {
  message: string;
  totalCount: number;
  pickups: PickupResponse[];
}

export interface PickupSearchParams extends Record<string, string | number | boolean | undefined> {
  companyId?: number;
  statusId?: number;
  dateFrom?: string;
  dateTo?: string;
  minValue?: number;
  maxValue?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' ;
}

export interface PickupAnalyticsResponse {
  totalPickups: number;
  totalRevenue: number;
  averageOrderValue: number;
  pendingPickups: number;
  completedPickups: number;
  revenueByMonth: {
    month: string;
    revenue: number;
    pickups: number;
  }[];
  topCompanies: {
    companyId: number;
    companyName: string;
    revenue: number;
    pickups: number;
  }[];
  statusDistribution: {
    statusId: number;
    statusName: string;
    count: number;
    percentage: number;
  }[];
}

// ============================================================================
// TRUCK TYPES
// ============================================================================

export interface TruckTypeResponse {
  truckTypeId: number;
  truckTypeName: string;
}

export interface TruckResponse {
  truckId: number;
  truckTypeId: number;
  truckType: {
    truckTypeId: number;
    truckTypeName: string;
  };
  maxPickups: number;
  maxDropoffs: number;
  dailyOperatingCost: number;
  maxCapacity: number;
}

export interface CreateTruckRequest extends Record<string, unknown> {
  truckTypeId: number;
  maxPickups: number;
  maxDropoffs: number;
  dailyOperatingCost: number;
  maxCapacity: number;
}

export interface UpdateTruckRequest extends Record<string, unknown> {
  truckTypeId?: number;
  maxPickups?: number;
  maxDropoffs?: number;
  dailyOperatingCost?: number;
  maxCapacity?: number;
}

export interface CreateTruckTypeRequest extends Record<string, unknown> {
  truckTypeName: string;
}

export interface TrucksListResponse {
  message: string;
  totalCount: number;
  trucks: TruckResponse[];
}

export interface TruckTypesListResponse {
  message: string;
  totalCount: number;
  truckTypes: TruckTypeResponse[];
}

// ============================================================================
// ANALYTICS TYPES - UPDATED TO MATCH BACKEND IMPLEMENTATION
// ============================================================================

// Dashboard Analytics Response - Main dashboard endpoint
export interface DashboardAnalyticsResponse {
  totalRevenue: number;
  totalPickups: number;
  totalCompanies: number;
  averageOrderValue: number;
  revenueGrowth: number;
  pickupGrowth: number;
  companyGrowth: number;
  pendingPickups: number;
  completedPickups: number;
  activeCompanies: number;
  recentPickups: RecentPickupItem[];
  topCompanies: TopCompanyItem[];
  statusDistribution: StatusDistributionItem[];
  revenueTrend: RevenueTrendItem[];
}

// KPI Analytics Response - Detailed KPIs
export interface KPIAnalyticsResponse {
  totalRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  revenueGrowthRate: number;
  totalPickups: number;
  monthlyPickups: number;
  pickupGrowthRate: number;
  averagePickupsPerCompany: number;
  totalCompanies: number;
  activeCompanies: number;
  newCompanies: number;
  companyRetentionRate: number;
  averageProcessingTime: number;
  completionRate: number;
  pendingPickupsRatio: number;
  periodStart: string;
  periodEnd: string;
  comparisonPeriodStart: string;
  comparisonPeriodEnd: string;
}

// Trend Analytics Response - Historical trends
export interface TrendAnalyticsResponse {
  revenueByMonth: MonthlyRevenueItem[];
  companyTrends: CompanyTrendItem[];
  statusTrends: StatusTrendItem[];
  seasonalPatterns: SeasonalPatternsData;
}

// Operational Analytics Response - Operational metrics
export interface OperationalAnalyticsResponse {
  averageProcessingTime: number;
  processingTimeByStatus: ProcessingTimeByStatusItem[];
  dailyVolume: DailyVolumeItem[];
  companyDistribution: CompanyDistributionData;
  geographicDistribution: GeographicDistributionItem[];
  benchmarks: BenchmarksData;
}

// Forecast Analytics Response - Predictive analytics
export interface ForecastAnalyticsResponse {
  revenueForecast: ForecastItem[];
  pickupForecast: ForecastItem[];
  growthProjections: GrowthProjectionsData;
  modelAccuracy: ModelAccuracyData;
}

// Combined Analytics Response - All analytics in one call
export interface CombinedAnalyticsResponse {
  dashboard: DashboardAnalyticsResponse;
  kpis: KPIAnalyticsResponse;
  trends: TrendAnalyticsResponse;
  operational: OperationalAnalyticsResponse;
  generatedAt: string;
  parameters: AnalyticsParameters;
}

// Analytics Health Response
export interface AnalyticsHealthResponse {
  status: string;
  timestamp: string;
  services: {
    database: string;
    analytics: string;
    cache: string;
  };
  version: string;
}

// Export Analytics Response
export interface ExportAnalyticsResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  expiresAt: string;
  reportType: string;
  generatedAt: string;
}

// Supporting interfaces for nested data structures
export interface RecentPickupItem {
  pickupId: number;
  pickupDate: string;
  customer: string;
  companyId: number;
  companyName: string;
  statusName: string;
  amount: number;
}

export interface TopCompanyItem {
  companyId: number;
  companyName: string;
  totalRevenue: number;
  totalPickups: number;
  averageOrderValue: number;
  firstPickupDate: string | null;
  lastPickupDate: string | null;
}

export interface StatusDistributionItem {
  statusId: number;
  statusName: string;
  count: number;
}

export interface RevenueTrendItem {
  period: string;
  revenue: number;
  pickupCount: number;
  averageOrderValue: number;
}

export interface MonthlyRevenueItem {
  month: string;
  revenue: number;
  pickups: number;
  growth: number;
}

export interface CompanyTrendItem {
  companyId: number;
  companyName: string;
  monthlyData: {
    month: string;
    revenue: number;
    pickups: number;
  }[];
}

export interface StatusTrendItem {
  statusId: number;
  statusName: string;
  monthlyData: {
    month: string;
    count: number;
  }[];
}

export interface SeasonalPatternsData {
  quarterlyRevenue: {
    quarter: string;
    revenue: number;
    growth: number;
  }[];
  monthlyAverages: {
    month: string;
    averageRevenue: number;
    averagePickups: number;
  }[];
}

export interface ProcessingTimeByStatusItem {
  statusId: number;
  statusName: string;
  averageTime: number;
}

export interface DailyVolumeItem {
  date: string;
  pickups: number;
  revenue: number;
}

export interface CompanyDistributionData {
  byRevenue: {
    companyId: number;
    companyName: string;
    revenue: number;
    percentage: number;
  }[];
  byPickupCount: {
    companyId: number;
    companyName: string;
    pickups: number;
    percentage: number;
  }[];
}

export interface GeographicDistributionItem {
  region: string;
  pickups: number;
  revenue: number;
}

export interface BenchmarksData {
  industryAverageOrderValue: number;
  industryAverageProcessingTime: number;
  ourPerformanceRating: string;
}

export interface ForecastItem {
  period: string;
  predicted: number;
  confidence: number;
}

export interface GrowthProjectionsData {
  nextQuarterRevenue: number;
  nextQuarterPickups: number;
  yearEndProjection: {
    revenue: number;
    pickups: number;
    companies: number;
  };
}

export interface ModelAccuracyData {
  revenueAccuracy: number;
  pickupAccuracy: number;
  lastUpdated: string;
}

export interface AnalyticsParameters {
  includeGrowthRates: boolean;
  includeComparisons: boolean;
  includeTrends: boolean;
  includeForecasts: boolean;
}

// Updated to reflect what can be calculated from actual TruckEntity data
export interface FleetAnalyticsResponse {
  totalTrucks: number;                    // Count of TruckEntity records
  totalCapacity: number;                  // Sum of max_capacity
  averageDailyCost: number;               // Average of daily_operating_cost
  utilizationRate: number;                // Mock value (no utilization tracking yet)
  costEfficiency: number;                 // Mock value (calculated metric)
  maintenanceCost: number;                // Mock value (not tracked yet)
  fuelCost: number;                       // Mock value (not tracked yet)
  truckTypes: {
    truckTypeId: number;                  // truck_type_id
    truckTypeName: string;                // truck_type_name from TruckTypeEntity
    count: number;                        // Count of trucks of this type
    totalCapacity: number;                // Sum of max_capacity for this type
    averageDailyCost: number;             // Average daily_operating_cost for this type
  }[];
}

// Legacy interface - kept for backward compatibility
export interface DashboardKPIsResponse {
  fleet: {
    totalTrucks: number;
    totalCapacity: number;
    averageDailyCost: number;
    utilizationRate: number;
  };
  pickups: {
    totalPickups: number;
    totalRevenue: number;
    averageOrderValue: number;
    pendingPickups: number;
  };
  companies: {
    totalCompanies: number;
    activeCompanies: number;
    topPerformer: {
      companyName: string;
      revenue: number;
    };
  };
  trends: {
    revenueGrowth: number;
    pickupGrowth: number;
    fleetGrowth: number;
  };
}

export interface AnalyticsQueryParams extends Record<string, string | number | boolean | undefined> {
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
  truckTypeId?: number;
  limit?: number;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ErrorResponse {
  status: 'fail' | 'error';
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
  method: string;
  requestId: string;
  stack?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' ; // Support both cases to match backend validation
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// PICKUP STATUS TYPES
// ============================================================================

export interface PickupStatusResponse {
  pickupStatusId: number;
  statusName: string;
}
