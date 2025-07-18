import mongoose from 'mongoose';
import logger from './logger.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB Atlas');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

export default connectDB;
