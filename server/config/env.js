import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(__dirname, '..');
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');

// Load .env from the server package (falls back to the repository root).
dotenv.config({ path: path.join(SERVER_ROOT, '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * In development we allow a generated secret so the platform boots with zero
 * configuration. Production refuses to start without an explicit secret.
 */
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (isProduction) {
    throw new Error(
      'JWT_SECRET is required in production. Copy server/.env.example to server/.env and set a strong value.',
    );
  }
  const generated = crypto.randomBytes(48).toString('hex');
  if (!isTest) {
    // eslint-disable-next-line no-console
    console.warn('[config] JWT_SECRET not set - generated an ephemeral development secret (tokens reset on restart).');
  }
  return generated;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  isDevelopment: !isProduction && !isTest,
  isTest,
  port: int(process.env.PORT, 5000),
  host: process.env.HOST ?? '0.0.0.0',
  mongoUri: process.env.MONGO_URI ?? process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/learnai',
  clientUrls: (process.env.CLIENT_URL ?? 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  jwtIssuer: 'learnai-api',
  cookieName: process.env.COOKIE_NAME ?? 'learnai_token',
  cookieSecure: bool(process.env.COOKIE_SECURE, isProduction),
  cookieSameSite: process.env.COOKIE_SAME_SITE ?? (isProduction ? 'none' : 'lax'),
  cookieMaxAgeMs: int(process.env.COOKIE_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000),
  bcryptRounds: int(process.env.BCRYPT_ROUNDS, isTest ? 4 : 12),
  rateLimit: {
    windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    authMax: int(process.env.RATE_LIMIT_AUTH_MAX, 40),
    submissionMax: int(process.env.RATE_LIMIT_SUBMISSION_MAX, 60),
    apiMax: int(process.env.RATE_LIMIT_API_MAX, 600),
  },
  execution: {
    provider: process.env.EXECUTION_PROVIDER ?? 'client-sandbox',
    serviceUrl: process.env.EXECUTION_SERVICE_URL ?? '',
    serviceToken: process.env.EXECUTION_SERVICE_TOKEN ?? '',
    timeoutMs: int(process.env.EXECUTION_TIMEOUT_MS, 5000),
  },
  sandboxTicketTtlMs: int(process.env.SANDBOX_TICKET_TTL_MS, 60 * 60 * 1000),
  seed: {
    adminUsername: process.env.SEED_ADMIN_USERNAME ?? 'admin',
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@learnai.dev',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
    demoPassword: process.env.SEED_DEMO_PASSWORD ?? 'Practice@123',
    demoUsers: int(process.env.SEED_DEMO_USERS, 6),
  },
  maxCodeSizeBytes: int(process.env.MAX_CODE_SIZE_BYTES, 60000),
  rateLimitsEnabled: bool(process.env.RATE_LIMITS_ENABLED, !isTest),
};

export default env;
