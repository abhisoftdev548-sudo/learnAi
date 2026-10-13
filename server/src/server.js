'use strict';
const env = require('./config/env');
const { connectDB, closeDB } = require('./config/db');
const app = require('./app');

let server = null;

async function start() {
  await connectDB();
  server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`[server] Growth Circle API listening on http://0.0.0.0:${env.port} (${env.nodeEnv})`);
  });
}

/** Graceful shutdown with a hard deadline (the embedded engine can hold sockets). */
function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down...`);
  const force = setTimeout(() => {
    console.warn('[server] forced exit');
    process.exit(0);
  }, 5000);
  force.unref();
  const done = () => process.exit(0);
  if (server) {
    server.close(async () => {
      await closeDB();
      done();
    });
  } else {
    closeDB().then(done, done);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('[server] unhandled rejection:', err);
});

start().catch((e) => {
  console.error('[server] failed to start:', e);
  process.exit(1);
});
