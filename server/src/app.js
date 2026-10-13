'use strict';
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const env = require('./config/env');
const { originCheck } = require('./middleware/auth');
const { handleUploadError } = require('./middleware/upload');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

// Behind a proxy in production — express-rate-limit needs the real client IP.
app.set('trust proxy', 1);

// Security headers. 'crossOriginResourcePolicy' allows the API + client to share
// an origin in the single-server production setup while Cloudinary images render.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// CORS — credentials allowed only for configured origins.
const allowed = new Set(env.allowedOrigins);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowed.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(originCheck);

// ---- API routes ------------------------------------------------------------
app.get('/api/health', (req, res) =>
  res.json({ success: true, data: { status: 'ok', env: env.nodeEnv, time: new Date().toISOString() } })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/events', require('./routes/events'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/community', require('./routes/community'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

app.use(handleUploadError);
app.use('/api', notFound);

// ---- Serve the built client (single-server production/preview setup) -------
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: env.isProd ? '1h' : 0 }));
  // SPA fallback — any non-API GET renders the client app.
  app.get(/^\/(?!api).*/, (req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => err && next());
  });
}

app.use(errorHandler);

module.exports = app;
