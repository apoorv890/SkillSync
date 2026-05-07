import logger from './logger.js';
import chalk from 'chalk';

const METHOD_COLORS = {
  GET: chalk.blue,
  POST: chalk.green,
  PUT: chalk.yellow,
  PATCH: chalk.cyan,
  DELETE: chalk.red
};

const SEPARATOR = chalk.gray('─'.repeat(80));

const detectUserTriggered = (req) => {
  if (req.headers['x-user-action'] === 'true') {
    return true;
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return true;
  }
  const backgroundPatterns = ['/api/analytics', '/api/dashboard/stats'];
  const isBackground = backgroundPatterns.some((pattern) =>
    req.originalUrl?.includes(pattern)
  );
  return !isBackground;
};

export const attachLogPrefix = (req, res, next) => {
  req.startTime = Date.now();
  const isUserTriggered = detectUserTriggered(req);
  req.userTriggered = isUserTriggered;
  req.logPrefix = isUserTriggered ? '==> ' : '    ';
  req.logIndent = isUserTriggered ? '↳ ' : '    ↳ ';
  if (isUserTriggered) {
    logger.info(SEPARATOR);
    const methodColor = METHOD_COLORS[req.method] || chalk.white;
    const coloredMethod = methodColor(req.method);
    logger.info(`${req.logPrefix}${coloredMethod} ${req.originalUrl}`);
  }
  next();
};

export const logCompact = (req, message, meta = {}) => {
  const indent = req?.logIndent || '    ↳ ';
  const metaStr = Object.entries(meta || {})
    .map(([k, v]) => {
      const value = typeof v === 'string' && v.includes(' ') ? `"${v}"` : v;
      return `${k}=${value}`;
    })
    .join(' ');
  const parts = [indent + message, metaStr].filter(Boolean);
  logger.info(parts.join(' '));
};

export const logNested = (req, message, meta = {}) => {
  const indent = req?.logIndent || '    ↳ ';
  const metaStr = Object.entries(meta || {})
    .map(([k, v]) => {
      const value = typeof v === 'string' && v.includes(' ') ? `"${v}"` : v;
      return `${k}=${value}`;
    })
    .join(' ');
  const parts = [indent + message, metaStr].filter(Boolean);
  logger.info(parts.join(' '));
};

export default {
  attachLogPrefix,
  logCompact,
  logNested
};

