import { logRequestComplete } from '../utils/loggerHelper.js';

/**
 * Enhanced request logging middleware
 * - Logs request completion with performance indicators
 * - Uses logRequestComplete from loggerHelper for consistent formatting
 */
const requestLogger = (req, res, next) => {
  // Log when response finishes
  res.on('finish', () => {
    logRequestComplete(req, res);
  });

  next();
};

export default requestLogger;
