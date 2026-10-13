/**
 * Database seeder.
 *
 *   npm run seed         # upsert the catalogue + accounts (keeps user data)
 *   npm run seed:fresh   # drop the collections first, then seed everything
 *
 * Seeds: achievements, the admin account, demo team members with realistic
 * submission history, and the 12 starter challenges (4 HTML, 4 CSS, 4 JS).
 */
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import env from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import Challenge from '../models/Challenge.js';
import Submission from '../models/Submission.js';
import Achievement from '../models/Achievement.js';
import { buildAvatarUrl } from '../services/auth.service.js';
import { achievementSeed } from './achievements.js';
import { adminSeed, demoUserSeed } from './users.js';
import { htmlChallenges } from './challenges/html.js';
import { cssChallenges } from './challenges/css.js';
import { javascriptChallenges } from './challenges/javascript.js';
import { seedDemoActivity } from './demoActivity.js';

const allChallenges = [...htmlChallenges, ...cssChallenges, ...javascriptChallenges];

async function seedAchievements() {
  let upserted = 0;
  for (const [index, achievement] of achievementSeed.entries()) {
    // eslint-disable-next-line no-await-in-loop
    const result = await Achievement.updateOne(
      { key: achievement.key },
      { $set: { ...achievement, order: achievement.order ?? index + 1 } },
      { upsert: true },
    );
    if (result.upsertedCount || result.modifiedCount) upserted += 1;
  }
  return { total: achievementSeed.length, changed: upserted };
}

async function seedUsers({ fresh }) {
  const created = { admins: 0, demo: 0 };

  const upsertUser = async (definition, password, role = 'user') => {
    const existing = await User.findOne({ username: definition.username });
    if (existing) return existing;
    const user = new User({
      name: definition.name,
      username: definition.username,
      email: definition.email,
      password,
      role,
      bio: definition.bio ?? '',
      avatar: buildAvatarUrl(definition.username, definition.name),
    });
    await user.save();
    return user;
  };

  const admin = await upsertUser(adminSeed, env.seed.adminPassword, 'admin');
  if (admin.createdAt && Math.abs(Date.now() - new Date(admin.createdAt).getTime()) < 5000) created.admins += 1;

  const demoUsers = [];
  for (const definition of demoUserSeed) {
    // eslint-disable-next-line no-await-in-loop
    const user = await upsertUser(definition, env.seed.demoPassword);
    demoUsers.push(user);
    if (user.createdAt && Math.abs(Date.now() - new Date(user.createdAt).getTime()) < 5000) created.demo += 1;
  }

  if (fresh) logger.info('Seeded fresh admin and demo accounts');
  return { admin, demoUsers, created };
}

async function seedChallenges(adminId) {
  let created = 0;
  let updated = 0;

  for (const [index, definition] of allChallenges.entries()) {
    const payload = {
      ...definition,
      order: definition.order ?? index + 1,
      createdBy: adminId,
      isPublished: definition.isPublished ?? true,
    };
    const existing = await Challenge.findOne({ slug: definition.slug });
    if (existing) {
      Object.assign(existing, payload);
      // eslint-disable-next-line no-await-in-loop
      await existing.save();
      updated += 1;
    } else {
      // eslint-disable-next-line no-await-in-loop
      await Challenge.create(payload);
      created += 1;
    }
  }

  return { created, updated, total: allChallenges.length };
}

export async function seed({ fresh = false } = {}) {
  if (fresh) {
    logger.warn('Fresh seed requested — wiping challenges, submissions and demo users');
    await Promise.all([Challenge.deleteMany({}), Submission.deleteMany({}), User.deleteMany({ role: { $ne: 'admin' } })]);
  }

  const achievements = await seedAchievements();
  const { admin, demoUsers } = await seedUsers({ fresh });
  const challenges = await seedChallenges(admin._id);

  const categoryTotals = allChallenges.reduce((acc, challenge) => {
    acc[challenge.category] = (acc[challenge.category] ?? 0) + 1;
    return acc;
  }, {});

  let activity = null;
  const needsActivity = demoUsers.every((user) => (user.solvedChallenges?.length ?? 0) === 0);
  if (needsActivity) {
    const challengeDocs = await Challenge.find({ isPublished: true }).sort({ order: 1 });
    activity = await seedDemoActivity({ users: demoUsers, challenges: challengeDocs, categoryTotals });
  }

  return { achievements, challenges, users: { admin: admin.username, demo: demoUsers.map((user) => user.username) }, activity };
}

async function main() {
  const fresh = process.argv.includes('--fresh');
  await connectDatabase();
  const summary = await seed({ fresh });
  logger.info('Seed complete', JSON.stringify(summary, null, 2));
  logger.info(`Admin login: ${env.seed.adminUsername} / ${env.seed.adminPassword}`);
  logger.info(`Demo logins: ${env.seed.demoUsers} ... / ${env.seed.demoPassword}`);
  await disconnectDatabase();
  await mongoose.connection.close().catch(() => {});
}

const isDirectRun = (() => {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isDirectRun || process.env.SEED_RUN === '1') {
  main().catch(async (error) => {
    logger.error('Seed failed:', error);
    process.exitCode = 1;
    await disconnectDatabase().catch(() => {});
  });
}

export default seed;
