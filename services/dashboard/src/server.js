import app, { logger } from './app.js';

const PORT = Number(process.env.DASHBOARD_SERVICE_PORT || 5006);

app.listen(PORT, () => {
  logger.info(`Dashboard service listening on port ${PORT}`);
  console.log(`Dashboard service running on port ${PORT}`);
});
