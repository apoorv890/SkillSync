import app, { connectDB, logger } from './app.js';

const PORT = Number(process.env.APPLICATIONS_SERVICE_PORT || 5003);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Applications service listening on port ${PORT}`);
      console.log(`Applications service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start applications service:', error);
    process.exit(1);
  }
};

start();
