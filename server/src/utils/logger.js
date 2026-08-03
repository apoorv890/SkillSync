import winston from 'winston';
import path from 'path';

const consoleFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}] ${message}`;
});

const serviceName = process.env.SERVICE_NAME || 'VoiceHire-backend';
const logsDir = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: serviceName },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Cloud Run (and most container platforms) only capture stdout/stderr, not
// local files, so the console transport must stay on in production too.
logger.add(
  new winston.transports.Console({
    format:
      process.env.NODE_ENV === 'production'
        ? winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.json()
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            consoleFormat
          )
  })
);

export default logger;

