import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectDB() {
  mongoose.set('sanitizeFilter', true);
  await mongoose.connect(env.MONGODB_URI, { autoIndex: env.NODE_ENV !== 'production', serverSelectionTimeoutMS: 10000, maxPoolSize: 20 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('MongoDB replica set or sharded cluster required for transactions');
}
