import app, { connectDB, logger } from './app.js';

const PORT = Number(process.env.AUTH_SERVICE_PORT || 5001);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Auth service listening on port ${PORT}`);
      console.log(`Auth service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start auth service:', error);
    process.exit(1);
  }
};

start();
