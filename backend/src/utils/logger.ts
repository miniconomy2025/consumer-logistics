import { createLogger, format, transports } from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, align, json } = format;

const consoleLogFormat = printf(({ level, message, timestamp, stack }) => {
  const msg = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
  return `${timestamp} [${level.toUpperCase()}] ${msg}${stack ? `\n${stack}` : ''}`;
});

export const logger = createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production' ?
      json() :
      combine(
        colorize({ all: true }),
        align(),
        consoleLogFormat
      )
  ),
  transports: [
    new transports.Console(), 

    ...(process.env.NODE_ENV === 'production' ? [
      new transports.File({
        filename: path.join(process.cwd(), 'logs', 'application.log'), 
        level: 'info'
      }),
      new transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error'
      })
    ] : [])
  ],

  exceptionHandlers: [
    new transports.Console(),
    ...(process.env.NODE_ENV === 'production' ? [
      new transports.File({
        filename: path.join(process.cwd(), 'logs', 'exceptions.log')
      })
    ] : [])
  ],
  rejectionHandlers: [
    new transports.Console(),
    ...(process.env.NODE_ENV === 'production' ? [
      new transports.File({
        filename: path.join(process.cwd(), 'logs', 'rejections.log')
      })
    ] : [])
  ]
});



logger.info('Winston logger initialized successfully.');