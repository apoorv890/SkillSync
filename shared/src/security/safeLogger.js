import logger from '../logger/index.js';

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'otp',
  'resetPasswordOTP',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'csrfToken',
  'creditCard',
  'ssn',
  'socialSecurityNumber'
];

function redactValue(value) {
  if (value === null || value === undefined) {
    return '[NULL]';
  }
  if (typeof value === 'string' && value.length > 0) {
    return '[REDACTED]';
  }
  return '[REDACTED]';
}

function sanitizeObjectInternal(obj, depth = 0) {
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectInternal(item, depth + 1));
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    const isSensitive = SENSITIVE_FIELDS.some(field =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = redactValue(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObjectInternal(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  return sanitizeObject(body);
}

export function sanitizeRequestHeaders(headers) {
  if (!headers || typeof headers !== 'object') {
    return headers;
  }

  const sanitized = { ...headers };

  if (sanitized.authorization) {
    sanitized.authorization = '[REDACTED]';
  }

  if (sanitized.cookie) {
    sanitized.cookie = '[REDACTED]';
  }

  return sanitizeObject(sanitized);
}

export function sanitizeQueryParams(query) {
  if (!query || typeof query !== 'object') {
    return query;
  }
  return sanitizeObject(query);
}

export const safeLogger = {
  info: (message, data = {}) => {
    const sanitized = sanitizeObject(data);
    logger.info(message, sanitized);
  },

  error: (message, data = {}) => {
    const sanitized = sanitizeObject(data);
    logger.error(message, sanitized);
  },

  warn: (message, data = {}) => {
    const sanitized = sanitizeObject(data);
    logger.warn(message, sanitized);
  },

  debug: (message, data = {}) => {
    const sanitized = sanitizeObject(data);
    logger.debug(message, sanitized);
  }
};

export function sanitizeObject(obj) {
  return sanitizeObjectInternal(obj, 0);
}

export function sanitizeError(error) {
  if (!error) {
    return null;
  }

  const sanitized = {
    message: error.message,
    name: error.name,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };

  if (error.data) {
    sanitized.data = sanitizeObject(error.data);
  }

  return sanitized;
}
