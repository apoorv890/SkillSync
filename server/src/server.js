import app from './app.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';

const PORT = Number(process.env.PORT || 5000);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`VoiceHire server listening on port ${PORT}`);
      console.log(`VoiceHire server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

