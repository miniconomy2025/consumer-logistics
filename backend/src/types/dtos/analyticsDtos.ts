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
// ANALYTICS QUERY PARAMETERS
// ============================================================================

export type AnalyticsDateRange = 'last7days' | 'last30days' | 'currentyear' | 'alltime';

export interface AnalyticsQueryParams {
  // Predefined date range (replaces dateFrom/dateTo)
  range?: AnalyticsDateRange;
  
  // Explicit date range (for custom periods)
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD

  // Comparison period (for growth calculations)
  comparisonRange?: AnalyticsDateRange;
  comparisonDateFrom?: string;
  comparisonDateTo?: string;

  // Basic filters
  companyId?: number;
}

