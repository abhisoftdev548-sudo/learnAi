import http from 'node:http';
import { pathToFileURL } from 'node:url';
import env from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';
import logger from './utils/logger.js';

async function start() {
  try {
    await connectDatabase();
  } catch (error) {
    logger.error('Could not reach MongoDB. Start mongod or set MONGO_URI in server/.env.', error.message);
    process.exit(1);
  }

  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.port, env.host, () => {
    logger.info(`LearnAI API listening on http://${env.host}:${env.port} (${env.nodeEnv})`);
    logger.info(`Allowed client origins: ${env.clientUrls.join(', ') || 'none'}`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection:', reason));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  return server;
}

// Only boot when executed directly (`node server.js`); scripts such as
// `scripts/start-memory.js` import { start } and call it themselves.
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) start();

export { start };
