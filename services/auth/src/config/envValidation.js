/**
 * Environment variable validation
 * Validates all required environment variables at startup
 */

const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'INTERNAL_SERVICE_TOKEN',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET_NAME'
];

const optionalEnvVars = {
  'JWT_EXPIRES_IN': '7d',
  'NODE_ENV': 'development',
  'ALLOWED_ORIGINS': 'http://localhost:3000',
  'LOG_LEVEL': 'info',
  'AWS_REGION': 'us-east-1',
  'AUTH_SERVICE_PORT': '5001'
};

/**
 * Validate environment variables
 * Throws error if required vars are missing
 */
export function validateEnv() {
  const missing = [];
  
  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please set these in your .env file before starting the server.'
    );
  }
  
  // Set defaults for optional variables
  for (const [varName, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
    }
  }
  
  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for production use');
  }
  
  return true;
}
