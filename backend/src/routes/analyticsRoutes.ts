import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();
const analyticsController = new AnalyticsController();

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// Dashboard Analytics - Main dashboard data
router.get('/dashboard', analyticsController.getDashboardAnalytics);

// KPI Analytics - Key Performance Indicators
router.get('/kpis', analyticsController.getKPIAnalytics);

// Trend Analytics - Historical trends and patterns
router.get('/trends', analyticsController.getTrendAnalytics);

// Operational Analytics - Operational efficiency metrics
router.get('/operational', analyticsController.getOperationalAnalytics);



// Combined Analytics - All analytics in one call
router.get('/all', analyticsController.getAllAnalytics);

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Health Check - Analytics system health
router.get('/health', analyticsController.getAnalyticsHealth);



// ============================================================================
// LEGACY/COMPATIBILITY ENDPOINTS
// ============================================================================

// Legacy endpoint for backward compatibility with existing frontend
router.get('/', analyticsController.getDashboardAnalytics);

export default router;
