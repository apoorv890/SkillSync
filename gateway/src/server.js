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
const AUTH_UPSTREAM =
  process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:5001';
const JOBS_UPSTREAM =
  process.env.JOBS_SERVICE_URL || 'http://127.0.0.1:5002';
const APPLICATIONS_UPSTREAM =
  process.env.APPLICATIONS_SERVICE_URL || 'http://127.0.0.1:5003';

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
    apiUpstream: API_UPSTREAM,
    authUpstream: AUTH_UPSTREAM,
    jobsUpstream: JOBS_UPSTREAM,
    applicationsUpstream: APPLICATIONS_UPSTREAM,
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiLimiter);

const proxyError =
  (label) => (err, _req, res) => {
    logger.error(`Gateway proxy error (${label}): ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: `Bad gateway — ${label} unavailable`
      });
    }
  };

const authProxy = createProxyMiddleware({
  target: AUTH_UPSTREAM,
  changeOrigin: true,
  proxyTimeout: 120000,
  timeout: 120000,
  logLevel: 'warn',
  onError: proxyError('auth service')
});

const jobsProxy = createProxyMiddleware({
  target: JOBS_UPSTREAM,
  changeOrigin: true,
  proxyTimeout: 120000,
  timeout: 120000,
  logLevel: 'warn',
  onError: proxyError('jobs service')
});

const applicationsProxy = createProxyMiddleware({
  target: APPLICATIONS_UPSTREAM,
  changeOrigin: true,
  proxyTimeout: 120000,
  timeout: 120000,
  logLevel: 'warn',
  onError: proxyError('applications service')
});

const apiProxy = createProxyMiddleware({
  target: API_UPSTREAM,
  changeOrigin: true,
  proxyTimeout: 120000,
  timeout: 120000,
  logLevel: 'warn',
  onError: proxyError('API')
});

// Do not mount body parsers before proxy — preserves multipart and JSON streams
app.use('/api/applications', applicationsProxy);
app.use('/api/candidates', applicationsProxy);
app.use('/api/jobs', jobsProxy);
app.use('/api/auth', authProxy);
app.use('/api/users', authProxy);
app.use('/api', apiProxy);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(
    `SkillSync API gateway listening on port ${PORT} (apps → ${APPLICATIONS_UPSTREAM}, jobs → ${JOBS_UPSTREAM}, auth → ${AUTH_UPSTREAM}, api → ${API_UPSTREAM})`
  );
  console.log(`Gateway running on port ${PORT}`);
});
