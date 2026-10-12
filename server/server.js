import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
let server;
try {
  await connectDB();
  server = app.listen(env.PORT, '0.0.0.0', () => console.log(`LearnAI API listening on port ${env.PORT}`));
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.on('error', () => { console.error('HTTP server failed'); shutdown(1); });
} catch {
  console.error('Startup failed. Check database availability, replica-set configuration, and environment variables.');
  await mongoose.disconnect(); process.exitCode = 1;
}
let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10000); deadline.unref();
  const finish = async () => { await mongoose.disconnect(); process.exit(code); };
  if (server) server.close(finish); else finish();
}
process.on('SIGTERM', () => shutdown());
process.on('SIGINT', () => shutdown());
process.on('unhandledRejection', () => { console.error('Unhandled rejection; shutting down'); shutdown(1); });
process.on('uncaughtException', () => { console.error('Uncaught exception; shutting down'); shutdown(1); });
