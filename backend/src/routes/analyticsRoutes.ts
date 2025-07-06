import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();
const analyticsController = new AnalyticsController();

router.get('/dashboard', analyticsController.getDashboardAnalytics);
router.get('/kpis', analyticsController.getKPIAnalytics);
router.get('/health', analyticsController.getAnalyticsHealth);

export default router;
