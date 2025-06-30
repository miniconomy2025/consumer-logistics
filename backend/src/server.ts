import 'reflect-metadata'; 
import dotenv from 'dotenv';
import path from 'path';
import app from './app'; 
import { AppDataSource } from './database/config'; 
import { logger } from './utils/logger';

dotenv.config({ path: path.resolve(__dirname, '../.env') }); 

const port = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

AppDataSource.initialize()
  .then(() => {
    logger.info('Data Source has been initialized successfully.');
    const server = app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('UNHANDLED REJECTION! Shutting down...', { reason, promise });
      server.close(() => {
        process.exit(1);
      });
    });
  })
  .catch((error) => {
    logger.error('Failed to connect to the database or start the server:', error);
    process.exit(1); 
  });