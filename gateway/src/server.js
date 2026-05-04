import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import logger from '@skillsync/shared/logger';

const PORT = Number(process.env.GATEWAY_PORT || 5000);

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

/** http-proxy-middleware v3: Express strips the mount path from req.url before proxying.
 * Upstream services still expect full paths like /api/auth/register — rewrite them back.
 * `xfwd: true` forwards X-Forwarded-* so upstream rate limiters can key off real client IP. */
const proxyOpts = {
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 120000,
  timeout: 120000,
  logLevel: 'warn'
};

function serviceProxy(target, upstreamApiPrefix, label) {
  return createProxyMiddleware({
    ...proxyOpts,
    target,
    pathRewrite: (path) => upstreamApiPrefix + (path || ''),
    onError: proxyError(label)
  });
}

const authProxy = serviceProxy(AUTH_UPSTREAM, '/api/auth', 'auth service');
const usersProxy = serviceProxy(AUTH_UPSTREAM, '/api/users', 'auth service');
const jobsProxy = serviceProxy(JOBS_UPSTREAM, '/api/jobs', 'jobs service');
const applicationsProxy = serviceProxy(
  APPLICATIONS_UPSTREAM,
  '/api/applications',
  'applications service'
);
const candidatesProxy = serviceProxy(
  APPLICATIONS_UPSTREAM,
  '/api/candidates',
  'applications service'
);
const searchProxy = serviceProxy(SEARCH_UPSTREAM, '/api/search', 'search service');
const dashboardProxy = serviceProxy(
  DASHBOARD_UPSTREAM,
  '/api/dashboard',
  'dashboard service'
);
const analyticsProxy = serviceProxy(
  DASHBOARD_UPSTREAM,
  '/api/analytics',
  'dashboard service'
);

// Do not mount body parsers before proxy — preserves multipart and JSON streams
app.use('/api/applications', applicationsProxy);
app.use('/api/candidates', candidatesProxy);
app.use('/api/search', searchProxy);
app.use('/api/dashboard', dashboardProxy);
app.use('/api/analytics', analyticsProxy);
app.use('/api/jobs', jobsProxy);
app.use('/api/auth', authProxy);
app.use('/api/users', usersProxy);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(
    `SkillSync API gateway listening on port ${PORT} (apps → ${APPLICATIONS_UPSTREAM}, search → ${SEARCH_UPSTREAM}, dashboard → ${DASHBOARD_UPSTREAM}, jobs → ${JOBS_UPSTREAM}, auth → ${AUTH_UPSTREAM})`
  );
  console.log(`Gateway running on port ${PORT}`);
});
