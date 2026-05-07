import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { validateEnv } from './config/envValidation.js';
import { attachLogPrefix } from './utils/loggerHelper.js';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

validateEnv();

const app = express();
app.set('trust proxy', 1);

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

app.use(helmet());
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

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

export default app;

