const requiredEnvVars = ['JWT_SECRET', 'INTERNAL_SERVICE_TOKEN'];

const optionalEnvVars = {
  NODE_ENV: 'development',
  DASHBOARD_SERVICE_PORT: '5006',
  ALLOWED_ORIGINS: 'http://localhost:3000',
  LOG_LEVEL: 'info',
  AUTH_SERVICE_URL: 'http://127.0.0.1:5001',
  JOBS_SERVICE_URL: 'http://127.0.0.1:5002',
  APPLICATIONS_SERVICE_URL: 'http://127.0.0.1:5003'
};

export function validateEnv() {
  const missing = [];
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Set these in the repository root `.env` before starting the dashboard service.'
    );
  }
  for (const [varName, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
    }
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for production use');
  }
  return true;
}
