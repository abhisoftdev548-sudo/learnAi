import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import * as models from '../models/index.js';
import { challenges, achievements } from './data.js';
import { register } from '../utils/validation.js';
try {
  await connectDB();
  for (const model of Object.values(models)) await model.createIndexes();
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const adminInput = register.parse({ name: 'Platform Admin', username: 'platform_admin', email, password });
  let admin = await models.User.findOne({ email });
  if (admin && admin.role !== 'admin') throw new Error('Seed refuses to promote an existing regular account');
  if (!admin) admin = await models.User.create({ ...adminInput, role: 'admin' });
  for (const data of achievements) await models.Achievement.updateOne({ key: data.key }, { $setOnInsert: data }, { upsert: true });
  for (const data of challenges) await models.Challenge.updateOne({ slug: data.slug }, { $setOnInsert: { ...data, createdBy: admin._id } }, { upsert: true });
  console.log('Seed complete: 12 challenges and 8 achievements (existing records preserved).');
} catch {
  console.error('Seed failed. Check replica-set connectivity and valid SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. Existing regular accounts are never promoted.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
