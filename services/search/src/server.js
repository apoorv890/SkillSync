import app, { connectDB, logger } from './app.js';

const PORT = Number(process.env.SEARCH_SERVICE_PORT || 5005);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Search service listening on port ${PORT}`);
      console.log(`Search service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start search service:', error);
    process.exit(1);
  }
};

start();
