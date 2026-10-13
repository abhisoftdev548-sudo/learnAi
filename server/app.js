import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env, { PROJECT_ROOT } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import logger from './utils/logger.js';

export function createApp() {
  const app = express();

  // Behind the sandbox/preview proxy we need the real client IP for rate limits.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The API serves JSON; the SPA build is served with its own relaxed policy.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const allowedOrigins = new Set(env.clientUrls);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true); // same-origin / server-to-server
        if (allowedOrigins.has(origin)) return callback(null, true);
        // Same host, different port (e.g. the sandbox live preview) is allowed.
        try {
          const host = new URL(origin).hostname;
          if (env.clientUrls.some((allowed) => new URL(allowed).hostname === host)) return callback(null, true);
        } catch {
          /* ignore malformed origins */
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  app.use(express.json({ limit: '512kb' }));
  app.use(express.urlencoded({ extended: true, limit: '512kb' }));
  app.use(cookieParser());

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: { write: (message) => logger.info(message.trim()) } }));
  }

  app.use('/api', apiLimiter, routes);

  // Optionally serve the built React client (single-origin deployment).
  const clientDist = path.join(PROJECT_ROOT, 'client', 'dist');
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    logger.info(`Serving client build from ${clientDist}`);
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
