// Load environment variables FIRST - before importing app
import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import logger from '@skillsync/shared/logger';

// Default 5500 when placed behind the API gateway (port 5000). Override with PORT in .env.
const PORT = process.env.PORT || 5500;

// Declare server variable in outer scope
let server;

const startServer = () => {
  try {
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`Server running on port ${PORT}`);
    });

    setupGracefulShutdown();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Setup graceful shutdown
const setupGracefulShutdown = () => {
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
    if (server) {
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
    }
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
    if (server) {
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
    if (server) {
  server.close(() => {
    process.exit(1);
  });
    }
});
};

startServer();

export default server;
