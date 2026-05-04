import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import logger from '@skillsync/shared/logger';
import { getCsrfToken } from './middleware/csrf.js';

const PORT = Number(process.env.GATEWAY_PORT || 5000);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required for the gateway (CSRF cookie signing)');
}

const AUTH_UPSTREAM =
  process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:5001';
const JOBS_UPSTREAM =
  process.env.JOBS_SERVICE_URL || 'http://127.0.0.1:5002';
const APPLICATIONS_UPSTREAM =
  process.env.APPLICATIONS_SERVICE_URL || 'http://127.0.0.1:5003';
const SEARCH_UPSTREAM =
  process.env.SEARCH_SERVICE_URL || 'http://127.0.0.1:5005';
const DASHBOARD_UPSTREAM =
  process.env.DASHBOARD_SERVICE_URL || 'http://127.0.0.1:5006';

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
app.use(cookieParser(jwtSecret));

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    service: 'gateway',
    authUpstream: AUTH_UPSTREAM,
    jobsUpstream: JOBS_UPSTREAM,
    applicationsUpstream: APPLICATIONS_UPSTREAM,
    searchUpstream: SEARCH_UPSTREAM,
    dashboardUpstream: DASHBOARD_UPSTREAM,
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiLimiter);

app.get('/api/csrf-token', getCsrfToken, (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken()
  });
});

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

const searchProxy = createProxyMiddleware({
  target: SEARCH_UPSTREAM,
  changeOrigin: true,
  proxyTimeout: 120000,
  timeout: 120000,
  logLevel: 'warn',
  onError: proxyError('search service')
});

const dashboardProxy = createProxyMiddleware({
  target: DASHBOARD_UPSTREAM,
  changeOrigin: true,
  proxyTimeout: 120000,
  timeout: 120000,
  logLevel: 'warn',
  onError: proxyError('dashboard service')
});

// Do not mount body parsers before proxy — preserves multipart and JSON streams
app.use('/api/applications', applicationsProxy);
app.use('/api/candidates', applicationsProxy);
app.use('/api/search', searchProxy);
app.use('/api/dashboard', dashboardProxy);
app.use('/api/analytics', dashboardProxy);
app.use('/api/jobs', jobsProxy);
app.use('/api/auth', authProxy);
app.use('/api/users', authProxy);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(
    `SkillSync API gateway listening on port ${PORT} (apps → ${APPLICATIONS_UPSTREAM}, search → ${SEARCH_UPSTREAM}, dashboard → ${DASHBOARD_UPSTREAM}, jobs → ${JOBS_UPSTREAM}, auth → ${AUTH_UPSTREAM})`
  );
  console.log(`Gateway running on port ${PORT}`);
});
