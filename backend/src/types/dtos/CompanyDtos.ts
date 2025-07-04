// Company DTOs for API requests and responses

// Request DTO for creating a Company
export interface CreateCompanyRequest {
  companyName: string;
}

// Request DTO for updating a Company
export interface UpdateCompanyRequest {
  companyName?: string;
}

// Response DTO for a Company
export interface CompanyResponse {
  companyId: number;
  companyName: string;
}

// Response DTO for Company with statistics (for analytics)
export interface CompanyWithStatsResponse extends CompanyResponse {
  totalPickups: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastPickupDate: string | null;
}

// Response DTO for Company performance metrics
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

// Generic list response for companies
export interface CompaniesListResponse {
  message: string;
  totalCount: number;
  companies: CompanyResponse[];
}

// List response for companies with stats
export interface CompaniesWithStatsListResponse {
  message: string;
  totalCount: number;
  companies: CompanyWithStatsResponse[];
}

// List response for company performance
export interface CompanyPerformanceListResponse {
  message: string;
  totalCount: number;
  companies: CompanyPerformanceResponse[];
}
