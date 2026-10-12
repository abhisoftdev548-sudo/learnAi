import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../app.js';
import * as models from '../models/index.js';
import { challenges, achievements } from '../seed/data.js';
const enabled = process.env.RUN_MONGO_TESTS === '1' || !!process.env.TEST_MONGODB_URI;
const origin = 'http://localhost:5173';
const write = (agent, method, path, body) => agent[method](path).set('Origin', origin).send(body);
const payload = { name: 'Alice', username: 'alice', email: 'alice@example.com', password: 'correct-horse-battery' };
const solution = '<article class="profile"><h1>Alice</h1><p>Bio</p><img alt="Alice" src="photo.jpg"><a href="mailto:a@example.com">Email</a></article>';
// Intentionally opt-in: a supplied TEST_MONGODB_URI must point to a disposable *_test database.
describe.skipIf(!enabled)('MongoDB replica-set integration', () => {
  let replica, alice, bob, admin, userId, challengeId, submissionId, authCookie;
  beforeAll(async () => {
    let uri = process.env.TEST_MONGODB_URI;
    if (!uri) { replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.24' } }); uri = replica.getUri('learnai_test'); }
    if (!new URL(uri).pathname.replace(/^\//, '').endsWith('_test')) throw new Error('Refusing to erase a database not ending in _test');
    await mongoose.connect(uri);
    await mongoose.connection.dropDatabase();
    for (const model of Object.values(models)) { await model.createCollection(); await model.createIndexes(); }
    await models.Achievement.insertMany(achievements);
    alice = request.agent(app); bob = request.agent(app); admin = request.agent(app);
  });
  afterAll(async () => { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); if (replica) await replica.stop(); });
  it('registers, hashes passwords, sets session, and rejects duplicates', async () => {
    const res = await write(alice, 'post', '/api/auth/register', payload);
    expect(res.status).toBe(201); userId = res.body.data._id; authCookie = res.headers['set-cookie'][0].split(';')[0];
    expect(res.body.data.password).toBeUndefined();
    const stored = await models.User.findById(userId).select('+password');
    expect(stored.password).not.toBe(payload.password); expect(await bcrypt.compare(payload.password, stored.password)).toBe(true);
    expect((await write(request(app), 'post', '/api/auth/register', payload)).status).toBe(409);
    expect((await alice.get('/api/auth/me')).body.data.username).toBe('alice');
    expect((await write(bob, 'post', '/api/auth/register', { ...payload, username: 'bobby', email: 'bob@example.com' })).status).toBe(201);
  });
  it('enforces admin authorization and authenticates an admin', async () => {
    expect((await alice.get('/api/admin/dashboard')).status).toBe(403);
    await models.User.create({ ...payload, username: 'administrator', email: 'admin@example.com', role: 'admin' });
    expect((await write(admin, 'post', '/api/auth/login', { email: 'admin@example.com', password: payload.password })).status).toBe(200);
    expect((await write(alice, 'post', '/api/challenges', {})).status).toBe(403);
  });
  it('creates, filters and updates challenges without revealing tests to users', async () => {
    const { slug, ...input } = challenges[0];
    const res = await write(admin, 'post', '/api/challenges', input);
    expect(res.status).toBe(201); challengeId = res.body.data._id;
    expect((await write(admin, 'put', `/api/challenges/${challengeId}`, { ...input, maxAttempts: 3 })).status).toBe(200);
    const read = await alice.get(`/api/challenges/${challengeId}`);
    expect(read.body.data.testCases).toBeUndefined();
    expect((await admin.get(`/api/challenges/${challengeId}`)).body.data.testCases).toHaveLength(5);
    expect((await alice.get('/api/challenges?category=HTML&difficulty=Easy')).body.data.total).toBe(1);
    expect((await alice.get('/api/challenges?category=CSS')).body.data.total).toBe(0);
    expect((await alice.get('/api/challenges?search=Profile')).body.data.total).toBe(1);
    expect((await alice.get('/api/challenges?search=%5BProfile%5D')).body.data.total).toBe(0);
    expect((await alice.get(`/api/challenges/${challengeId}/progress`)).body.data).toEqual({ attempts: 0, completed: false });
  });
  it('stores failed submissions without awarding XP', async () => {
    const res = await write(alice, 'post', '/api/submissions', { challengeId, htmlCode: '<p>Wrong</p>' });
    expect(res.status).toBe(201); expect(res.body.data.submission).toMatchObject({ status: 'failed', score: 0, xpEarned: 0, attemptNumber: 1 });
  });
  it('awards first solve, XP, streak, statistics and achievements atomically', async () => {
    const res = await write(alice, 'post', '/api/submissions', { challengeId, htmlCode: solution, timeTaken: 20 });
    expect(res.status).toBe(201); expect(res.body.data.submission).toMatchObject({ score: 100, status: 'passed', xpEarned: 70, attemptNumber: 2 });
    submissionId = res.body.data.submission._id;
    expect(res.body.data.achievements.map(a => a.key).sort()).toEqual(['first-challenge', 'perfect-score']);
    const user = await models.User.findById(userId);
    expect(user).toMatchObject({ xp: 70, challengesSolved: 1, currentStreak: 1, submissionCount: 2 });
    expect((await models.Challenge.findById(challengeId)).solvedCount).toBe(1);
    expect((await alice.get(`/api/challenges/${challengeId}/progress`)).body.data).toEqual({ attempts: 2, completed: true });
    expect((await alice.get('/api/challenges')).body.data.items[0].completed).toBe(true);
    expect((await alice.get('/api/achievements')).body.data).toHaveLength(8);
  });
  it('does not farm XP and enforces the attempt limit', async () => {
    const res = await write(alice, 'post', '/api/submissions', { challengeId, htmlCode: solution });
    expect(res.status).toBe(201); expect(res.body.data.submission.xpEarned).toBe(0); expect(res.body.data.achievements).toHaveLength(0);
    expect((await write(alice, 'post', '/api/submissions', { challengeId, htmlCode: solution })).status).toBe(409);
    expect(await models.UserAchievement.countDocuments({ userId })).toBe(2);
  });
  it('protects submission ownership and returns history without full source', async () => {
    const history = await alice.get('/api/submissions/me'); expect(history.body.data.total).toBe(3);
    expect(history.body.data.items[0].htmlCode).toBeUndefined();
    expect((await alice.get(`/api/submissions/${submissionId}`)).body.data.htmlCode).toBe(solution);
    expect((await bob.get(`/api/submissions/${submissionId}`)).status).toBe(404);
  });
  it('exposes profile progress, allows safe updates, and hides other emails', async () => {
    const profile = await alice.get('/api/users/me');
    expect(profile.body.data).toMatchObject({ xp: 70, bestScore: 100, challengesSolved: 1, averageScore: 66.67 });
    expect(profile.body.data.activity.reduce((sum, day) => sum + day.count, 0)).toBe(3);
    expect(profile.body.data.progress.HTML).toMatchObject({ solved: 1, total: 1, percentage: 100 });
    expect((await bob.get('/api/users/alice')).body.data.email).toBeUndefined();
    expect((await write(alice, 'put', '/api/users/me', { bio: 'Learning CSS' })).body.data.bio).toBe('Learning CSS');
    expect((await write(alice, 'put', '/api/users/me', { xp: 10000 })).status).toBe(400);
  });
  it('returns weekly, monthly and all-time rankings with own rank', async () => {
    for (const period of ['weekly', 'monthly', 'all-time']) {
      const res = await alice.get(`/api/leaderboard?period=${period}`);
      expect(res.status).toBe(200); expect(res.body.data.me).toMatchObject({ username: 'alice', rank: 1, xp: 70, challengesSolved: 1 });
      expect(res.body.data.items[0].email).toBeUndefined();
    }
  });
  it('keeps concurrent first solves and attempt limits consistent', async () => {
    const { slug, ...input } = challenges[0];
    const created = await write(admin, 'post', '/api/challenges', { ...input, title: 'Concurrent challenge', maxAttempts: 1 });
    const cid = created.body.data._id;
    const results = await Promise.all([1, 2].map(() => write(bob, 'post', '/api/submissions', { challengeId: cid, htmlCode: solution })));
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
    expect(await models.Submission.countDocuments({ challengeId: cid })).toBe(1);
    expect((await models.User.findOne({ username: 'bobby' })).xp).toBe(80);
  });
  it('provides dashboard and team management statistics', async () => {
    const dashboard = await admin.get('/api/admin/dashboard');
    expect(dashboard.status).toBe(200); expect(dashboard.body.data).toMatchObject({ totalUsers: 3, totalSubmissions: 4, activeUsers: 2, mostPopularCategory: 'HTML' });
    const created = await write(admin, 'post', '/api/admin/teams', { name: 'Team One', slug: 'team-one' });
    expect(created.status).toBe(201);
    expect((await write(admin, 'put', `/api/admin/users/${userId}/team`, { teamId: created.body.data._id })).status).toBe(200);
    expect((await alice.get('/api/teams/me')).body.data.name).toBe('Team One');
    expect((await admin.get('/api/admin/teams')).body.data.items[0].stats).toMatchObject({ members: 1, xp: 70, challengesSolved: 1 });
    expect((await admin.get('/api/admin/users')).body.data.total).toBe(3);
    expect((await admin.get('/api/admin/submissions')).body.data.total).toBe(4);
  });
  it('preserves submitted challenges and history after archival', async () => {
    const { slug, ...input } = challenges[0];
    expect((await write(admin, 'put', `/api/challenges/${challengeId}`, input)).status).toBe(409);
    expect((await write(admin, 'delete', `/api/challenges/${challengeId}`)).status).toBe(200);
    expect((await alice.get(`/api/challenges/${challengeId}`)).status).toBe(404);
    expect((await alice.get(`/api/submissions/${submissionId}`)).body.data.challengeId.title).toBe('Profile Card');
    expect((await write(alice, 'post', '/api/submissions', { challengeId, htmlCode: solution })).status).toBe(404);
  });
  it('logs out, revokes copied cookies, and allows a fresh login', async () => {
    expect((await write(alice, 'post', '/api/auth/logout')).status).toBe(200);
    expect((await alice.get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Cookie', authCookie)).status).toBe(401);
    expect((await write(alice, 'post', '/api/auth/login', { email: payload.email, password: payload.password })).status).toBe(200);
  });
});
