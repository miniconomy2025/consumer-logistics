import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../shared/errors/ApplicationError';
import { FinancialNotificationService } from '../services/financialNotificationService';

export class WebhookController {
  private financialNotificationService: FinancialNotificationService;

  constructor(
    financialNotificationService: FinancialNotificationService 
  ) {
    this.financialNotificationService = financialNotificationService;
  }

  public handleCommercialBankPaymentNotification = async (req: Request, res: Response, next: NextFunction) => {
    logger.info('Received Commercial Bank Payment Notification Webhook.');
    logger.debug('Webhook Body:', req.body);

    try {
      const notificationData = req.body;

      await this.financialNotificationService.processPaymentNotification(notificationData);

      res.status(200).send('Notification received and processed.');
    } catch (error) {
      logger.error('Error processing Commercial Bank payment notification:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).send(error.message);
      } else {
        res.status(500).send('Internal server error processing notification.');
      }
    }
  };
}