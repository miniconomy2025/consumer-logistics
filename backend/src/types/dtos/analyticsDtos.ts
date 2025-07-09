// Analytics DTOs for comprehensive dashboard and reporting endpoints

// ============================================================================
// DASHBOARD ANALYTICS
// ============================================================================

export interface DashboardAnalyticsResponse {
  // Overview KPIs
  totalRevenue: number;
  totalPickups: number;
  totalCompanies: number;
  averageOrderValue: number;
  
  // Growth metrics (compared to previous period)
  revenueGrowth: number; // percentage
  pickupGrowth: number; // percentage
  companyGrowth: number; // percentage
  
  // Current period metrics
  pendingPickups: number;
  completedPickups: number;
  activeCompanies: number;
  
  // Recent activity
  recentPickups: Array<{
    pickupId: number;
    companyName: string;
    customer: string;
    amount: number;
    status: string;
    date: string;
  }>;
  
  // Top performing companies
  topCompanies: Array<{
    companyId: number;
    companyName: string;
    totalRevenue: number;
    totalPickups: number;
    averageOrderValue: number;
  }>;
  
  // Status distribution
  statusDistribution: Array<{
    statusName: string;
    count: number;
    percentage: number;
  }>;
  
  // Revenue trend (last 12 months)
  revenueTrend: Array<{
    month: string; // YYYY-MM format
    revenue: number;
    pickupCount: number;
  }>;
}

// ============================================================================
// KPI ANALYTICS
// ============================================================================

export interface KPIAnalyticsResponse {
  // Financial KPIs
  totalRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  revenueGrowthRate: number; // percentage
  
  // Operational KPIs
  totalPickups: number;
  monthlyPickups: number;
  pickupGrowthRate: number; // percentage
  averagePickupsPerCompany: number;
  
  // Customer KPIs
  totalCompanies: number;
  activeCompanies: number; // companies with pickups in current month
  newCompanies: number; // companies added in current month
  companyRetentionRate: number; // percentage
  
  // Efficiency KPIs
  averageProcessingTime: number; // days from order to delivery
  completionRate: number; // percentage of completed vs total pickups
  pendingPickupsRatio: number; // percentage of pending pickups
  
  // Time period for calculations
  periodStart: string;
  periodEnd: string;
  comparisonPeriodStart: string;
  comparisonPeriodEnd: string;
}

// ============================================================================
// TREND ANALYTICS
// ============================================================================

export interface TrendAnalyticsResponse {
  // Revenue trends
  revenueByMonth: Array<{
    month: string; // YYYY-MM
    revenue: number;
    pickupCount: number;
    averageOrderValue: number;
    growthRate: number; // month-over-month percentage
  }>;
  
  // Company performance trends
  companyTrends: Array<{
    companyId: number;
    companyName: string;
    monthlyData: Array<{
      month: string;
      revenue: number;
      pickupCount: number;
      averageOrderValue: number;
    }>;
  }>;
  
  // Status trends
  statusTrends: Array<{
    statusName: string;
    monthlyData: Array<{
      month: string;
      count: number;
      percentage: number;
    }>;
  }>;
  
  // Seasonal patterns
  seasonalPatterns: {
    quarterlyRevenue: Array<{
      quarter: string; // Q1 2024, Q2 2024, etc.
      revenue: number;
      pickupCount: number;
    }>;
    monthlyAverages: Array<{
      monthName: string; // January, February, etc.
      averageRevenue: number;
      averagePickups: number;
    }>;
  };
}

// ============================================================================
// OPERATIONAL ANALYTICS
// ============================================================================

export interface OperationalAnalyticsResponse {
  // Processing efficiency
  averageProcessingTime: number; // days
  processingTimeByStatus: Array<{
    fromStatus: string;
    toStatus: string;
    averageDays: number;
  }>;
  
  // Volume analysis
  dailyVolume: Array<{
    date: string; // YYYY-MM-DD
    pickupCount: number;
    revenue: number;
  }>;
  
  // Company distribution
  companyDistribution: {
    byRevenue: Array<{
      range: string; // "0-1000", "1000-5000", etc.
      companyCount: number;
      totalRevenue: number;
    }>;
    byPickupCount: Array<{
      range: string; // "1-10", "11-50", etc.
      companyCount: number;
      totalPickups: number;
    }>;
  };
  
  // Geographic distribution (if location data available)
  geographicDistribution: Array<{
    region: string;
    companyCount: number;
    pickupCount: number;
    revenue: number;
  }>;
  
  // Performance benchmarks
  benchmarks: {
    industryAverageOrderValue: number;
    industryAverageProcessingTime: number;
    ourPerformanceRating: 'excellent' | 'good' | 'average' | 'below_average';
  };
}

// ============================================================================
// ANALYTICS QUERY PARAMETERS
// ============================================================================

export type AnalyticsDateRange = 'last7days' | 'last30days' | 'currentyear' | 'alltime';

export interface AnalyticsQueryParams {
  // Predefined date range (replaces dateFrom/dateTo)
  range?: AnalyticsDateRange;

  // Legacy date range filters (for backward compatibility during transition)
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD

  // Comparison period (for growth calculations)
  comparisonRange?: AnalyticsDateRange;
  comparisonDateFrom?: string;
  comparisonDateTo?: string;

  // Filters
  companyId?: number;
  companyIds?: number[]; // for multi-company analysis
  statusId?: number;
  statusIds?: number[];

  // Grouping options
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';

  // Aggregation options
  includeGrowthRates?: boolean;
  includeComparisons?: boolean;
  includeTrends?: boolean;
  includeForecasts?: boolean;

  // Pagination for large datasets
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: 'revenue' | 'pickups' | 'date' | 'company' | 'growth';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// FORECAST ANALYTICS
// ============================================================================

export interface ForecastAnalyticsResponse {
  // Revenue forecasts
  revenueForecast: Array<{
    month: string; // YYYY-MM
    predictedRevenue: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
    actualRevenue?: number; // if historical data
  }>;
  
  // Pickup volume forecasts
  pickupForecast: Array<{
    month: string;
    predictedPickups: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
    actualPickups?: number;
  }>;
  
  // Growth projections
  growthProjections: {
    nextQuarterRevenue: number;
    nextQuarterPickups: number;
    yearEndProjection: {
      revenue: number;
      pickups: number;
      companies: number;
    };
  };
  
  // Model accuracy metrics
  modelAccuracy: {
    revenueAccuracy: number; // percentage
    pickupAccuracy: number; // percentage
    lastUpdated: string;
    dataPoints: number; // number of historical data points used
  };
}

// ============================================================================
// EXPORT ANALYTICS
// ============================================================================

export interface ExportAnalyticsRequest {
  reportType: 'dashboard' | 'kpis' | 'trends' | 'operational' | 'forecast';
  format: 'csv' | 'excel' | 'pdf' | 'json';
  dateFrom: string;
  dateTo: string;
  filters?: AnalyticsQueryParams;
  includeCharts?: boolean;
  includeRawData?: boolean;
}

export interface ExportAnalyticsResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number; // bytes
  expiresAt: string; // ISO date string
  reportType: string;
  generatedAt: string;
}
