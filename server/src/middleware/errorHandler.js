import logger from '@skillsync/shared/logger';
import { sanitizeRequestBody, sanitizeQueryParams, sanitizeError } from '@skillsync/shared/security';

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Default to 500 server error
  statusCode = statusCode || 500;
  message = message || 'Internal Server Error';

  // In production, hide sensitive error details
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'Something went wrong!';
    statusCode = 500;
  }

  // Log error with sanitized context
  logger.error(message, {
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    body: sanitizeRequestBody(req.body),
    query: sanitizeQueryParams(req.query),
    params: req.params,
    error: sanitizeError(err)
  });

  // Send error response - sanitize message in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const response = {
    success: false,
    message: isDevelopment ? message : (statusCode === 500 ? 'Internal Server Error' : message),
    ...(isDevelopment && { stack: err.stack, details: err.message })
  };

  res.status(statusCode).json(response);
};

export default errorHandler;
