/**
 * CSRF (double-submit cookie). Issued at GET /api/csrf-token on the gateway;
 * validated on auth / jobs / applications routes behind the gateway.
 */

import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

export const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token. Please refresh the page and try again.'
    });
  }
  next(err);
};

export const getCsrfToken = csrfProtection;

export default csrfProtection;
