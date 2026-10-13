'use strict';
const path = require('node:path');
const fs = require('node:fs');
const mongoose = require('mongoose');
const env = require('./env');

let embedded = null;      // engine opened by THIS process (we close it)
let reusedEmbedded = false; // attached to a live engine owned by another process
let uriFile = null;       // uri file published by THIS process

/**
 * Connect to MongoDB.
 *  - MONGODB_URI set -> standard MongoDB instance.
 *  - otherwise       -> embedded MongoDB-compatible engine storing data in
 *                       server/.data/mongo (great for local dev & tests).
 *
 * When a sibling process (e.g. `npm run dev`) already runs an engine for the
 * same data directory, its published URI (`<dataDir>.uri`) is reused instead of
 * opening a second engine — concurrent embedded engines race in the native
 * layer, and the test suite relies on sharing the dev server's engine.
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
  const siblingUri = path.join(path.dirname(dataDir), `${path.basename(dataDir)}.uri`);

  // Attach to a live engine published by another process, if any.
  if (fs.existsSync(siblingUri)) {
    try {
      const uri = fs.readFileSync(siblingUri, 'utf8').trim();
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      reusedEmbedded = true;
      console.log(`[db] reusing live embedded engine (uri: ${siblingUri})`);
      return mongoose.connection;
    } catch (_) {
      try { fs.unlinkSync(siblingUri); } catch (_) { /* stale — ignore */ }
    }
  }

  embedded = await open(dataDir);
  await mongoose.connect(embedded.uri);
  // Publish the live URI so sibling processes (seed script, tests) can reuse
  // this engine instead of opening a second one.
  uriFile = siblingUri;
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
  } else if (reusedEmbedded) {
    // Not our engine — leave it (and its owner process) strictly alone.
    // Client sockets drop when this process exits; the engine tolerates that.
    reusedEmbedded = false;
  } else {
    // External MongoDB (MONGODB_URI) — normal disconnect is correct there.
    try {
      await mongoose.disconnect();
    } catch (_) { /* ignore */ }
  }
  if (uriFile) {
    try {
      fs.unlinkSync(uriFile);
    } catch (_) { /* ignore */ }
    uriFile = null;
  }
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((res) => setTimeout(res, ms))]);
}

module.exports = { connectDB, closeDB };
