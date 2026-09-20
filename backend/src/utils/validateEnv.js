const REQUIRED_ENV_VARS = ['PORT', 'MONGO_URI', 'JWT_SECRET', 'OPENWEATHER_API_KEY'];

const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('Environment variables validated successfully');
};

module.exports = validateEnv;