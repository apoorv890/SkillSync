import app, { connectDB, logger } from './app.js';

const PORT = Number(process.env.JOBS_SERVICE_PORT || 5002);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Jobs service listening on port ${PORT}`);
      console.log(`Jobs service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start jobs service:', error);
    process.exit(1);
  }
};

start();
