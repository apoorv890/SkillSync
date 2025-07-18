import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import logger from './config/logger.js';
import requestLogger from './middleware/requestLogger.js';
import { attachLogPrefix } from './utils/loggerHelper.js';
import errorHandler from './middleware/errorHandler.js';
import routes from './routes/index.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
