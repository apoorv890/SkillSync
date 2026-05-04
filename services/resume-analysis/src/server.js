import app, { logger } from './app.js';

const PORT = Number(process.env.RESUME_ANALYSIS_SERVICE_PORT || 5004);

const start = async () => {
  try {
    app.listen(PORT, () => {
      logger.info(`Resume analysis service listening on port ${PORT}`);
      console.log(`Resume analysis service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start resume-analysis service:', error);
    process.exit(1);
  }
};

start();
