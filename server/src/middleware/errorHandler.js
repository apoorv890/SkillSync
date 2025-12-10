import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Default to 500 server error
  statusCode = statusCode || 500;
  message = message || 'Internal Server Error';

  // Log error with context
  logger.error(message, {
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Send error response
  const response = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};

export default errorHandler;
