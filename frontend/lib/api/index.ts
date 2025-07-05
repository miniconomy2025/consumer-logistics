export * from './client';
export * as companiesApi from './companies';
export * as pickupsApi from './pickups';
export * as trucksApi from './trucks';
export * as analyticsApi from './analytics';

// Export types
export * from '../types/api';

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
