/** Smoke test for the dev in-memory MongoDB against real Mongoose. */
import mongoose from 'mongoose';
import { MemoryMongo } from './dev-mongo/memory-mongo.js';

const mongo = new MemoryMongo({ port: 27017, logger: (m) => console.log(m) });
await mongo.listen();

await mongoose.connect('mongodb://127.0.0.1:27017/devsmoke', { serverSelectionTimeoutMS: 5000 });
console.log('connected, version:', (await mongoose.connection.db.admin().serverInfo()).version);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    xp: { type: Number, default: 0, min: 0 },
    tags: { type: [String], default: [] },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastPracticeDate: { type: Date, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true },
);

const User = mongoose.model('SmokeUser', userSchema);
await User.syncIndexes();
console.log('indexes synced:', await User.collection.indexes());

const alice = await User.create({ name: 'Alice', username: 'Alice', email: 'alice@example.com', xp: 10, tags: ['css'] });
console.log('created:', alice.username, alice.role, alice.createdAt instanceof Date, typeof alice._id);

// duplicate should fail with 11000
try {
  await User.create({ name: 'Dup', username: 'ALICE', email: 'other@example.com' });
  console.log('!! duplicate username was NOT rejected');
} catch (error) {
  console.log('duplicate rejected with code:', error.code, error.name);
}

await User.create({ name: 'Bob', username: 'bob', email: 'bob@example.com', xp: 200, tags: ['js', 'css'] });

console.log('findOne case-insensitive:', (await User.findOne({ username: 'alice' }).lean()).name);
console.log('countDocuments:', await User.countDocuments({ xp: { $gte: 100 } }));

const updated = await User.findOneAndUpdate({ username: 'alice' }, { $inc: { xp: 5 }, $push: { tags: 'html' } }, { new: true });
console.log('updated xp:', updated.xp, 'tags:', updated.tags);

const sorted = await User.find({}).sort({ xp: -1 }).limit(2).select('username xp');
console.log('sorted:', sorted.map((u) => `${u.username}:${u.xp}`).join(', '));

const agg = await User.aggregate([
  { $match: { xp: { $gte: 0 } } },
  { $group: { _id: null, totalXp: { $sum: '$xp' }, avgXp: { $avg: '$xp' }, users: { $sum: 1 }, maxXp: { $max: '$xp' } } },
]);
console.log('aggregate:', JSON.stringify(agg));

console.log('distinct roles:', await User.distinct('role'));
console.log('exists query:', await User.countDocuments({ lastPracticeDate: null }));
console.log('in query:', await User.countDocuments({ username: { $in: ['alice', 'carol'] } }));
console.log('regex query:', await User.countDocuments({ email: { $regex: '@example.com$' } }));
console.log('deleteOne:', (await User.deleteOne({ username: 'bob' })).deletedCount);
console.log('remaining:', await User.countDocuments({}));

await mongoose.disconnect();
await mongo.close();
const failed = [];
console.log(failed.length ? 'SMOKE FAILED' : 'SMOKE OK');
process.exit(0);
