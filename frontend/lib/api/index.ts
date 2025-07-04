// API Services Index - Central Export Point

// Export API client and utilities
export * from './client';

// Export service modules
export * as companiesApi from './companies';
export * as pickupsApi from './pickups';
export * as trucksApi from './trucks';
export * as analyticsApi from './analytics';

// Export types
export * from '../types/api';

// Re-export commonly used functions for convenience
export {
  // Companies
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getTopPerformers,
  getCompanyPerformance,
} from './companies';

export {
  // Pickups
  getPickups,
  getPickupById,
  createPickup,
  updatePickup,
  deletePickup,
  searchPickups,
  getPickupAnalytics,
  getPickupStatus,
} from './pickups';

export {
  // Trucks
  getTrucks,
  getTruckById,
  createTruck,
  updateTruck,
  deleteTruck,
  getTruckTypes,
  getTruckTypeById,
  createTruckType,
  deleteTruckType,
  getFleetSummary,
} from './trucks';

export {
  // Analytics
  getDashboardKPIs,
  getCombinedAnalytics,
  getAnalyticsSummary,
  getFleetAnalytics,
  getTrendAnalysis,
  getRevenueTrends,
  getPickupTrends,
  analyticsPresets,
} from './analytics';
