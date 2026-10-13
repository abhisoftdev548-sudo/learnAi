import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

mongoose.set('strictQuery', true);
// NOTE: mongoose's `sanitizeFilter` stays at its default (off) because the API
// layer never forwards raw request payloads into queries — every filter is built
// explicitly from validated values (see utils/validate.js and the services).

let connectionPromise = null;

/** Connect to MongoDB using the configured URI (idempotent). */
export async function connectDatabase(uri = env.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: env.isTest ? 5000 : 10000,
      maxPoolSize: env.isTest ? 5 : 20,
      autoIndex: !env.isProduction,
    })
    .then(() => {
      logger.info(`MongoDB connected: ${maskUri(uri)}`);
      return mongoose.connection;
    })
    .catch((error) => {
      connectionPromise = null;
      logger.error(`MongoDB connection failed: ${error.message}`);
      throw error;
    });

  return connectionPromise;
}

export async function disconnectDatabase() {
  connectionPromise = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}

export function databaseState() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    state: states[mongoose.connection.readyState] ?? 'unknown',
    name: mongoose.connection.name ?? null,
    host: mongoose.connection.host ?? null,
  };
}

function maskUri(uri) {
  return String(uri).replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

export default connectDatabase;
