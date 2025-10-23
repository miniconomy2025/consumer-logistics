import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/ApplicationError';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { logger } from '../utils/logger';

jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

describe('errorMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockRequest = {
      originalUrl: '/test/path',
      method: 'GET'
    };
    mockResponse = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should pass error to next if headers already sent', () => {
    const error = new Error('Test error');
    mockResponse.headersSent = true;

    errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(error);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should handle AppError with stack trace in development mode', () => {
    process.env.NODE_ENV = 'development';
    const appError = new AppError('Test operational error', 400);
    appError.stack = 'Test stack trace';

    errorMiddleware(appError, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(logger.error).toHaveBeenCalledWith(
      'Operational error caught: Test operational error',
      expect.objectContaining({
        statusCode: 400,
        status: 'fail',
        path: '/test/path',
        method: 'GET',
        stack: 'Test stack trace'
      })
    );
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Test operational error',
      stack: 'Test stack trace'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle AppError without stack trace in production mode', () => {
    process.env.NODE_ENV = 'production';
    const appError = new AppError('Test operational error', 400);
    appError.stack = 'Test stack trace';

    errorMiddleware(appError, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(logger.error).toHaveBeenCalledWith(
      'Operational error caught: Test operational error',
      expect.objectContaining({
        statusCode: 400,
        status: 'fail',
        path: '/test/path',
        method: 'GET',
        stack: undefined
      })
    );
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Test operational error',
      stack: undefined
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle unexpected errors with stack trace in development mode', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Unexpected test error');
    error.stack = 'Test stack trace';

    errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected error caught: Unexpected test error',
      expect.objectContaining({
        stack: 'Test stack trace',
        path: '/test/path',
        method: 'GET'
      })
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'An unexpected error occurred. Please try again later.',
      stack: 'Test stack trace'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle unexpected errors without stack trace in production mode', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Unexpected test error');
    error.stack = 'Test stack trace';

    errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected error caught: Unexpected test error',
      expect.objectContaining({
        stack: 'Test stack trace',
        path: '/test/path',
        method: 'GET'
      })
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'An unexpected error occurred. Please try again later.',
      stack: undefined
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
