'use strict';
const path = require('node:path');
const mongoose = require('mongoose');
const env = require('./env');

let embedded = null;
let uriFile = null;

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

  const fs = require('node:fs');
  const { open } = require('@0q/embedded-mongodb');
  const dataDir = process.env.EMBEDDED_MONGO_DIR
    ? path.resolve(process.env.EMBEDDED_MONGO_DIR)
    : path.join(__dirname, '..', '..', '.data', 'mongo');
  embedded = await open(dataDir);
  await mongoose.connect(embedded.uri);
  // Publish the live URI so sibling processes (tests) can reuse this engine
  // instead of opening a second one — two concurrent embedded engines in one
  // container are racy in the native layer.
  uriFile = path.join(path.dirname(dataDir), `${path.basename(dataDir)}.uri`);
  try {
    fs.writeFileSync(uriFile, embedded.uri, 'utf8');
  } catch (_) { /* non-fatal */ }
  console.log(`[db] embedded MongoDB engine ready (data: ${dataDir})`);
  return mongoose.connection;
}

async function closeDB() {
  if (embedded) {
    // NOTE: never mongoose.disconnect() against the embedded engine — the
    // driver's endSessions() teardown segfaults the native engine (this build
    // has no session support). Closing the engine takes every client socket
    // down with it, which the engine handles fine.
    try {
      const e = embedded;
      embedded = null;
      await withTimeout(e.close(), 4000);
    } catch (_) { /* ignore */ }
  } else {
    try {
      await mongoose.disconnect();
    } catch (_) { /* ignore */ }
  }
  if (uriFile) {
    try {
      require('node:fs').unlinkSync(uriFile);
    } catch (_) { /* ignore */ }
    uriFile = null;
  }
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((res) => setTimeout(res, ms))]);
}

module.exports = { connectDB, closeDB };
