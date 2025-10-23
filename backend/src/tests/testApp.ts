import express from 'express';
import { FinanceController } from '../controllers/financeController';

export const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  const controller = new FinanceController();

  app.get('/api/account-summary', controller.getAccountSummary);
  app.get('/api/loan-status', controller.getLoanStatus);

  return app;
};
