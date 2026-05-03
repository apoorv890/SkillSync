import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import logger from '@skillsync/shared/logger';
import connectDB from '@skillsync/shared/db';
import { validateEnv } from './config/envValidation.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import internalRoutes from './routes/internalRoutes.js';

validateEnv();

const app = express();

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

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/internal', internalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', profileRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

export { connectDB, logger };
export default app;
