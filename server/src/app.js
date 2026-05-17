import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { validateEnv } from './config/envValidation.js';
import { attachLogPrefix } from './utils/loggerHelper.js';
import { ApiError, ApiResponse, HTTP_STATUS } from './utils/http.js';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import phoneRoutes from './routes/phoneRoutes.js';
import phoneAgentRoutes from './routes/phoneAgentRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';

validateEnv();

const app = express();
app.set('trust proxy', 1);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const publicIndexPath = path.join(publicDir, 'index.html');
const shouldServeSpa =
  (process.env.SERVE_SPA === '1' || process.env.NODE_ENV === 'production') &&
  existsSync(publicIndexPath);
const disableSpaCache = process.env.DISABLE_SPA_CACHE === '1';

// Serve static SPA assets BEFORE the CORS middleware.
// Vite bundles emit <script type="module" crossorigin>, which makes the browser
// attach an Origin header even for same-origin asset requests.  If those requests
// hit the CORS middleware first, and the server's own origin (e.g. http://localhost:5000)
// is not listed in ALLOWED_ORIGINS, CORS rejects them with a 500 JSON response and
// the browser refuses to execute the JS/CSS → blank screen.
// Static assets don't need CORS protection; only API routes do.
if (shouldServeSpa) {
  app.use(
    express.static(publicDir, {
      index: false,
      etag: !disableSpaCache,
      lastModified: !disableSpaCache,
      setHeaders(res) {
        if (disableSpaCache) {
          res.setHeader('Cache-Control', 'no-store');
        }
      }
    })
  );
}

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

app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://apis.google.com',
          'https://www.gstatic.com'
        ],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        connectSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://oauth2.googleapis.com',
          'https://www.googleapis.com'
        ],
        frameSrc: ["'self'", 'https://accounts.google.com'],
        formAction: ["'self'", 'https://accounts.google.com'],
      }
    }
  })
);
app.use(cors(corsOptions));
app.use(cookieParser(process.env.JWT_SECRET));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(attachLogPrefix);

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    service: 'skillsync-server',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/phone', phoneRoutes);
app.use('/api/phone-agent', phoneAgentRoutes);
app.use('/api/calendar', calendarRoutes);

if (shouldServeSpa) {
  app.get(/^(?!\/api(?:\/|$)|\/health$).*/, (_req, res) => {
    if (disableSpaCache) {
      res.setHeader('Cache-Control', 'no-store');
    }
    res.sendFile(publicIndexPath);
  });
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Central error handler (ensures JSON for ApiError so phone-agent can surface the real reason)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.message, err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  // Express body-parser / JSON parse errors
  if (err?.type === 'entity.parse.failed') {
    return ApiResponse.error(res, 'Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }

  return ApiResponse.error(
    res,
    err?.message || 'Internal server error',
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
});

export default app;

