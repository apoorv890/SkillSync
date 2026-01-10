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

  // Log error with context (sanitize sensitive data)
  const sanitizedBody = req.body ? { ...req.body } : {};
  // Remove sensitive fields from logs
  if (sanitizedBody.password) delete sanitizedBody.password;
  if (sanitizedBody.token) delete sanitizedBody.token;
  if (sanitizedBody.otp) delete sanitizedBody.otp;
  
  logger.error(message, {
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    body: sanitizedBody,
    query: req.query,
    params: req.params
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
