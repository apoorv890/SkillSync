import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import logger from '@skillsync/shared/logger';

// Listen port (avoid sharing PORT with the legacy API process loaded from server/.env)
const PORT = Number(process.env.GATEWAY_PORT || 5000);
const API_UPSTREAM =
  process.env.API_UPSTREAM_URL || 'http://127.0.0.1:5500';

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins =
      process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const app = express();

app.use(helmet());
app.use(cors(corsOptions));

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    service: 'gateway',
    upstream: API_UPSTREAM,
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiLimiter);

const proxy = createProxyMiddleware({
  target: API_UPSTREAM,
  changeOrigin: true,
  proxyTimeout: 120000,
  timeout: 120000,
  logLevel: 'warn',
  onError(err, _req, res) {
    logger.error(`Gateway proxy error: ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: 'Bad gateway — upstream API unavailable'
      });
    }
  }
});

// Do not mount body parsers before proxy — preserves multipart and JSON streams
app.use('/api', proxy);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`SkillSync API gateway listening on port ${PORT} (proxy → ${API_UPSTREAM})`);
  console.log(`Gateway running on port ${PORT}`);
});
