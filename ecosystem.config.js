module.exports = {
  apps: [
    {
      name: 'waas-bac',
      script: 'apps/backend/dist/src/main.js', 
      cwd: '/var/www/backend/waas_app',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3011,
        MONGODB_URI: process.env.MONGODB_URI,
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        USE_MOCK_AI: process.env.USE_MOCK_AI || 'false',
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
        AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:4000',
        AI_TIMEOUT: process.env.AI_TIMEOUT || 60000
      },
    },
  ],
};
