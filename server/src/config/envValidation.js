const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'GOOGLE_CLIENT_ID',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET_NAME'
];

const optionalEnvVars = {
  NODE_ENV: 'development',
  ALLOWED_ORIGINS: 'http://localhost:3000',
  LOG_LEVEL: 'info',
  AWS_REGION: 'us-east-1',
  PORT: '5000',
  JWT_EXPIRES_IN: '7d',
  JWT_REFRESH_EXPIRES_IN: '7d',
  PHONE_AGENT_BASE_URL: 'http://localhost:3010'
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
        'Please set these in the repository root `.env` before starting the server.'
    );
  }

  for (const [varName, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn(
      '⚠️  WARNING: JWT_SECRET should be at least 32 characters long for production use'
    );
  }

  return true;
}

