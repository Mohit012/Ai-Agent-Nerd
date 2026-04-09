import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'GEMINI_API_KEY'
];

const optionalEnvVars = [
  'SESSION_SECRET',
  'FRONTEND_URL',
  'PORT'
];

function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these variables in your .env file before starting the server.');
    process.exit(1);
  }
  
  const optional = optionalEnvVars.filter(key => !process.env[key]);
  if (optional.length > 0) {
    console.warn('⚠️  Optional environment variables not set (using defaults):');
    optional.forEach(key => console.warn(`   - ${key}`));
  }
  
  console.log('✅ Environment validation passed');
}

validateEnv();
