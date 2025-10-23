import { Router } from 'express';
import { FinanceController } from '../controllers/financeController';

const router = Router();
const controller = new FinanceController();

router.get('/account', controller.getAccountSummary);
router.get('/loan', controller.getLoanStatus);

export default router;

