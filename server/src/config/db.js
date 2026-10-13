'use strict';
const path = require('node:path');
const mongoose = require('mongoose');
const env = require('./env');

let embedded = null;

/**
 * Connect to MongoDB.
 *  - MONGODB_URI set  -> standard MongoDB instance.
 *  - otherwise        -> embedded MongoDB-compatible engine storing data in
 *                        server/.data/mongo (great for local dev & tests).
 *                        Requires USE_EMBEDDED_MONGO=1 implicitly when no URI.
 */
async function connectDB() {
  mongoose.set('strictQuery', true);

  if (env.mongoUri) {
    await mongoose.connect(env.mongoUri);
    console.log('[db] connected to MongoDB');
    return mongoose.connection;
  }

  if (!env.useEmbeddedMongo) {
    throw new Error('No MONGODB_URI configured and embedded mongo disabled.');
  }

  const { open } = require('@0q/embedded-mongodb');
  const dataDir = process.env.EMBEDDED_MONGO_DIR
    ? path.resolve(process.env.EMBEDDED_MONGO_DIR)
    : path.join(__dirname, '..', '..', '.data', 'mongo');
  embedded = await open(dataDir);
  await mongoose.connect(embedded.uri);
  console.log(`[db] embedded MongoDB engine ready (data: ${dataDir})`);
  return mongoose.connection;
}

async function closeDB() {
  try {
    await mongoose.disconnect();
  } catch (_) { /* ignore */ }
  if (embedded) {
    try {
      const e = embedded;
      embedded = null;
      await withTimeout(e.close(), 4000);
    } catch (_) { /* ignore */ }
  }
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((res) => setTimeout(res, ms))]);
}

module.exports = { connectDB, closeDB };
