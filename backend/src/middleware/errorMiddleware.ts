import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/ApplicationError';
import { logger } from '../utils/logger';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    const appError = err as AppError;

    logger.error(`Operational error caught: ${appError.message}`, {
      statusCode: appError.statusCode,
      status: appError.status,
      path: req.originalUrl,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? appError.stack : undefined,
    });

    return res.status(appError.statusCode).json({
      status: appError.status,
      message: appError.message,
      stack: process.env.NODE_ENV === 'development' ? appError.stack : undefined,
    });
  } else {
    logger.error(`Unexpected error caught: ${err.message}`, {
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    });

    const statusCode = 500;
    const status = 'error';
    const message = 'An unexpected error occurred. Please try again later.';

    return res.status(statusCode).json({
      status: status,
      message: message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
};