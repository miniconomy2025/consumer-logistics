// Company API Service Functions
// Backend company endpoints are now implemented and working

import { api } from './client';
import {
  CompanyResponse,
  CompanyWithStatsResponse,
  CompaniesListResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanyPerformanceResponse,
  AnalyticsQueryParams,
} from '../types/api';

// ============================================================================
// COMPANY CRUD OPERATIONS
// ============================================================================

/**
 * Get all companies
 */
export async function getCompanies(params?: {
  includeStats?: boolean;
  activeOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}): Promise<CompaniesListResponse> {
  return api.get<CompaniesListResponse>('/companies', params);
}

/**
 * Get company by ID
 */
export async function getCompanyById(id: number): Promise<CompanyResponse> {
  return api.get<CompanyResponse>(`/companies/${id}`);
}

/**
 * Create new company
 */
export async function createCompany(data: CreateCompanyRequest): Promise<CompanyResponse> {
  return api.post<CompanyResponse>('/companies', data);
}

/**
 * Update company
 */
export async function updateCompany(id: number, data: UpdateCompanyRequest): Promise<CompanyResponse> {
  return api.put<CompanyResponse>(`/companies/${id}`, data);
}

/**
 * Delete company
 */
export async function deleteCompany(id: number): Promise<void> {
  return api.delete<void>(`/companies/${id}`);
}

// ============================================================================
// COMPANY ANALYTICS AND PERFORMANCE (MOCK IMPLEMENTATIONS)
// TODO: Replace with actual API calls when backend analytics endpoints are implemented
// ============================================================================

/**
 * Get top performing companies
 * TODO: Replace with actual API call when backend analytics endpoints are implemented
 */
export async function getTopPerformers(params?: {
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<CompanyPerformanceResponse[]> {
  console.warn('[MOCK] getTopPerformers called - backend analytics not implemented');

  // For now, return empty array until analytics endpoints are implemented
  // In the future, this will call: api.get<CompanyPerformanceResponse[]>('/companies/top-performers', params)
  return Promise.resolve([]);
}

/**
 * Get company performance metrics
 * TODO: Replace with actual API call when backend analytics endpoints are implemented
 */
export async function getCompanyPerformance(
  id: number,
  _params?: {
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<CompanyPerformanceResponse> {
  console.warn('[MOCK] getCompanyPerformance called - backend analytics not implemented');

  // For now, return mock data until analytics endpoints are implemented
  // In the future, this will call: api.get<CompanyPerformanceResponse>(`/companies/${id}/performance`, params)
  return Promise.resolve({
    companyId: id,
    companyName: `Company ${id}`,
    totalRevenue: 0,
    totalPickups: 0,
    averageOrderValue: 0,
    revenueGrowth: 0,
    pickupGrowth: 0,
    lastPickupDate: null,
    performanceScore: 0,
    rank: 0,
  });
}

/**
 * Get company with statistics
 * TODO: Replace with actual API call when backend analytics endpoints are implemented
 */
export async function getCompanyWithStats(
  id: number,
  _params?: AnalyticsQueryParams
): Promise<CompanyWithStatsResponse> {
  console.warn('[MOCK] getCompanyWithStats called - backend analytics not implemented');

  // For now, return mock data until analytics endpoints are implemented
  // In the future, this will call: api.get<CompanyWithStatsResponse>(`/companies/${id}?includeStats=true`, params)
  return Promise.resolve({
    companyId: id,
    companyName: `Company ${id}`,
    totalPickups: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    lastPickupDate: null,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if company name is available
 */
export async function checkCompanyNameAvailability(name: string): Promise<boolean> {
  try {
    const companies = await getCompanies();
    return !companies.companies.some(
      company => company.companyName.toLowerCase() === name.toLowerCase()
    );
  } catch {
    return false;
  }
}

/**
 * Get companies for dropdown/select components
 */
export async function getCompaniesForSelect(): Promise<Array<{ value: number; label: string }>> {
  try {
    const companies = await getCompanies();
    return companies.companies.map(company => ({
      value: company.companyId,
      label: company.companyName,
    }));
  } catch {
    return [];
  }
}

