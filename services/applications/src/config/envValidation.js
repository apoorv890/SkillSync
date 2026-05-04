const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'INTERNAL_SERVICE_TOKEN',
  'GROQ_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET_NAME'
];

const optionalEnvVars = {
  NODE_ENV: 'development',
  ALLOWED_ORIGINS: 'http://localhost:3000',
  LOG_LEVEL: 'info',
  AWS_REGION: 'us-east-1',
  AUTH_SERVICE_URL: 'http://127.0.0.1:5001',
  JOBS_SERVICE_URL: 'http://127.0.0.1:5002',
  RESUME_ANALYSIS_SERVICE_URL: 'http://127.0.0.1:5004',
  APPLICATIONS_SERVICE_PORT: '5003'
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
        'Please set these in server/.env before starting the applications service.'
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
