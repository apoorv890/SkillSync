/**
 * CSRF Protection Middleware
 * Note: csurf is deprecated, but functional. Consider migrating to csrf package in future.
 */

import csrf from 'csurf';

// CSRF protection configuration
// Uses cookie-based CSRF tokens (more secure than session-based for stateless APIs)
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    sameSite: 'strict' // Prevent CSRF attacks
  }
});

/**
 * CSRF error handler
 * Provides user-friendly error messages for CSRF token failures
 */
export const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token. Please refresh the page and try again.'
    });
  }
  next(err);
};

/**
 * Get CSRF token (for token endpoint)
 * This middleware generates a token and attaches it to req.csrfToken()
 */
export const getCsrfToken = csrfProtection;

/**
 * CSRF protection middleware for state-changing routes
 * Apply this to POST, PUT, PATCH, DELETE routes
 */
export default csrfProtection;
