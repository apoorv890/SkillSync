// Load environment variables FIRST - before importing app
import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import logger from './src/config/logger.js';
import connectDB from './src/config/database.js';

const PORT = process.env.PORT || 5000;

// Declare server variable in outer scope
let server;

// Connect to database before starting server
const startServer = async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`Server running on port ${PORT}`);
    });
    
    // Setup graceful shutdown handlers
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

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

export default server;
