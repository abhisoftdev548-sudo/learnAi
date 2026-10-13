'use strict';
const path = require('node:path');
const dotenv = require('dotenv');

// Load server/.env (and the repo-root .env as a fallback) exactly once.
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || '',
  useEmbeddedMongo: process.env.USE_EMBEDDED_MONGO === '1' || !process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieMaxAgeMs: parseInt(process.env.COOKIE_MAX_AGE_MS || String(7 * 24 * 60 * 60 * 1000), 10),
  clientUrls: (process.env.CLIENT_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '2', 10),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};

env.allowedOrigins = [...new Set([...env.clientUrls, ...env.corsOrigins])];

if (!env.isProd) {
  if (!env.jwtSecret) {
    // Dev/test convenience only — production refuses to boot without a secret.
    env.jwtSecret = 'teamforge-dev-insecure-secret-do-not-use-in-production';
    console.warn('[env] JWT_SECRET missing — using an insecure development default.');
  }
} else if (!env.jwtSecret || env.jwtSecret.length < 32) {
  console.error('[env] A strong JWT_SECRET (>= 32 chars) is required in production.');
  process.exit(1);
}

module.exports = env;
