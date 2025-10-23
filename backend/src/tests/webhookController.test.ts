import { WebhookController } from '../controllers/webhookController';
import { FinancialNotificationService } from '../services/financialNotificationService';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('WebhookController', () => {
  let controller: WebhookController;
  let mockService: jest.Mocked<FinancialNotificationService>;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockService = {
      processPaymentNotification: jest.fn(),
    } as any;

    controller = new WebhookController(mockService);

    mockReq = { body: { transactionId: '123', amount: 1000 } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  // Happy path
  it('should process payment notification and return 200', async () => {
    await controller.handleCommercialBankPaymentNotification(mockReq, mockRes, mockNext);

    expect(logger.info).toHaveBeenCalledWith('Received Commercial Bank Payment Notification Webhook.');
    expect(logger.debug).toHaveBeenCalledWith('Webhook Body:', mockReq.body);
    expect(mockService.processPaymentNotification).toHaveBeenCalledWith(mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith('Notification received and processed.');
  });

  // AppError case
  it('should handle AppError and respond with custom status/message', async () => {
    const appError = new AppError('Bad request', 400);
    mockService.processPaymentNotification.mockRejectedValue(appError);

    await controller.handleCommercialBankPaymentNotification(mockReq, mockRes, mockNext);

    expect(logger.error).toHaveBeenCalledWith(
      'Error processing Commercial Bank payment notification:',
      appError
    );
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith('Bad request');
  });

  // Generic error case
  it('should handle unexpected errors and respond with 500', async () => {
    const unknownError = new Error('Something went wrong');
    mockService.processPaymentNotification.mockRejectedValue(unknownError);

    await controller.handleCommercialBankPaymentNotification(mockReq, mockRes, mockNext);

    expect(logger.error).toHaveBeenCalledWith(
      'Error processing Commercial Bank payment notification:',
      unknownError
    );
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith('Internal server error processing notification.');
  });
});
