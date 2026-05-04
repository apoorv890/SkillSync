const requiredEnvVars = ['MONGODB_URI'];

const optionalEnvVars = {
  NODE_ENV: 'development',
  SEARCH_SERVICE_PORT: '5005',
  ALLOWED_ORIGINS: 'http://localhost:3000',
  LOG_LEVEL: 'info'
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
        'Set these in server/.env before starting the search service.'
    );
  }
  for (const [varName, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
    }
  }
  return true;
}
