/**
 * Boot the API against the in-memory development MongoDB.
 *
 * Use this only where a real `mongod` is unavailable (CI containers, restricted
 * sandboxes): `npm run dev:memory`. Normal development uses `npm run dev` with a
 * real MongoDB via MONGO_URI.
 *
 *   node scripts/start-memory.js            # start API (+ seed if empty)
 *   node scripts/start-memory.js --seed     # force a seed run
 *   node scripts/start-memory.js --fresh    # wipe and re-seed
 */
import { MemoryMongo } from './dev-mongo/memory-mongo.js';

process.env.MONGO_URI = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/learnai';
process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';

const port = Number(process.env.MEMORY_MONGO_PORT ?? 27017);

const memoryMongo = new MemoryMongo({
  port,
  logger: (message) => console.log(message),
});
await memoryMongo.listen();

const { connectDatabase } = await import('../config/db.js');
const { seed } = await import('../seed/index.js');
const User = await import('../models/User.js');

await connectDatabase(process.env.MONGO_URI);

const flags = process.argv.slice(2);
const fresh = flags.includes('--fresh');
const forceSeed = fresh || flags.includes('--seed');

const userCount = await User.default.countDocuments({});
if (forceSeed || userCount === 0) {
  const summary = await seed({ fresh });
  console.log('[dev-mongo] seeded:', JSON.stringify(summary));
} else {
  console.log(`[dev-mongo] database already contains ${userCount} users — skipping seed (use --seed to force)`);
}

const { start } = await import('../server.js');
await start();

// The API's own shutdown handler closes the database; the in-memory server is
// closed here so the process can exit cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await memoryMongo.close();
    process.exit(0);
  });
}
