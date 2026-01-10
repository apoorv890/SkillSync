import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import logger from './config/logger.js';
import requestLogger from './middleware/requestLogger.js';
import { attachLogPrefix } from './utils/loggerHelper.js';
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// CORS configuration - restrict to allowed origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for API routes
app.use('/api', apiLimiter);

// Request logging with user-action detection
app.use(requestLogger);
app.use(attachLogPrefix); // Attach logPrefix to req object

// Connect to MongoDB
connectDB();

// API Routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Log startup
logger.info('SkillSync Backend initialized');

export default app;
