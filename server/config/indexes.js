import mongoose from 'mongoose';
import { connectDB } from './db.js';
import * as models from '../models/index.js';
try {
  await connectDB();
  for (const model of Object.values(models)) await model.createIndexes();
  console.log('Database indexes created.');
} catch { console.error('Index creation failed; check database and existing unique values.'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
