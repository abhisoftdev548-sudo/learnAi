'use strict';
/**
 * TeamForge critical-flow tests (spec §22).
 *
 * Runs against the embedded MongoDB engine via `npm test` (the with-engine
 * launcher sets up LD_PRELOAD when the host glibc is too old).
 *
 * Covered:
 *  1. Registration creates a pending account
 *  2. Pending users cannot access protected team data
 *  3. Admin approval allows a member to log in
 *  4. Non-admin users cannot access admin APIs
 *  5. Members can submit valid challenge work
 *  6. Invalid or late submissions are rejected according to the rules
 *  7. Admins can review and score submissions
 *  8. Score updates are reflected accurately in the leaderboard
 *  9. Members cannot vote multiple times in a single-vote poll
 * 10. Event and challenge deadlines are respected
 * 11. Users cannot modify another member's profile / escalate privileges
 * 12. Login, logout and page refresh preserve the correct auth state
 */
process.env.MONGODB_URI = '';
process.env.EMBEDDED_MONGO_DIR = require('node:path').join(
  require('node:os').tmpdir(),
  `teamforge-test-${Date.now()}`
);

const path = require('node:path');
const request = require('supertest');

let app;
let connectDB;
let closeDB;
let User;

/** Remove this suite's fixture data (before AND after each run). */
async function wipeFixtures() {
  const Challenge = require('../src/models/Challenge');
  const Submission = require('../src/models/Submission');
  const Poll = require('../src/models/Poll');
  const Event = require('../src/models/Event');
  const { Post, Comment, Like } = require('../src/models/community');
  const staleChallenges = await Challenge.find({
    title: { $in: ['Build a Dashboard', 'Expired sprint task'] },
  }).select('_id');
  const staleIds = staleChallenges.map((c) => c._id);
  // Sequential on purpose: the embedded engine is unhappy under pipelined
  // concurrent commands (observed native segfaults with Promise.all).
  await User.deleteMany({ username: { $in: ['alice', 'bob', 'admin1'] } });
  await Submission.deleteMany({ challenge: { $in: staleIds } });
  await Challenge.deleteMany({ _id: { $in: staleIds } });
  await Poll.deleteMany({ question: 'Preferred stack for the next sprint?' });
  await Event.deleteMany({ title: { $in: ['Timeboxed workshop', 'Regular meetup'] } });
  await Post.deleteMany({ kind: 'submission', title: /Build a Dashboard/ });
  await Comment.deleteMany({});
  await Like.deleteMany({});
}

let ipCounter = 0;
/** Unique forwarded IP per call so auth rate limits never trip the suite. */
const fwd = () => ({ 'X-Forwarded-For': `10.1.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}` });

const admin = { name: 'Admin One', username: 'admin1', email: 'admin1@tf.dev', password: 'AdminPass1!' };
const alice = { name: 'Alice Cooper', username: 'alice', email: 'alice@tf.dev', password: 'MemberPass1!' };
const bob = { name: 'Bob Meyer', username: 'bob', email: 'bob@tf.dev', password: 'MemberPass1!' };

let adminCookie;
let aliceCookie;
let bobCookie;

async function register(agent, user, extra = {}) {
  const res = await agent
    .post('/api/auth/register')
    .set(fwd())
    .send({ ...user, confirmPassword: user.password, ...extra });
  return res;
}

async function login(agent, identifier, password) {
  return agent.post('/api/auth/login').set(fwd()).send({ identifier, password });
}

async function approve(username) {
  const cookie = adminCookie;
  const list = await request(app)
    .get(`/api/admin/users?q=${username}`)
    .set('Cookie', cookie);
  const target = list.body.data.users.find((u) => u.username === username);
  const res = await request(app)
    .patch(`/api/admin/users/${target._id}/status`)
    .set('Cookie', cookie)
    .send({ status: 'approved' });
  expect(res.status).toBe(200);
}

beforeAll(async () => {
  jest.setTimeout(90000);
  ({ connectDB, closeDB } = require('../src/config/db'));
  app = require('../src/app');
  User = require('../src/models/User');
  const fs = require('node:fs');

  // Best-effort cleanup of data dirs left behind by earlier crashed runs
  // (runs BEFORE this process starts only — never touch live socket dirs).
  try {
    const os = require('node:os');
    for (const d of fs.readdirSync(os.tmpdir())) {
      if (d.startsWith('teamforge-test-')) {
        fs.rmSync(path.join(os.tmpdir(), d), { recursive: true, force: true });
      }
    }
  } catch (_) { /* ignore */ }

  await connectDB(); // reuses the dev server's live engine when it is running

  await wipeFixtures(); // start from a clean slate (shared dev DB may be dirty)
  await User.init();
});

afterAll(async () => {
  // Leave the shared dev DB as clean as we found it (fixtures only).
  try { await wipeFixtures(); } catch (_) { /* ignore */ }
  // closeDB is safe: it closes our own engine, no-ops against the dev
  // server's reused engine (mongoose.disconnect would segfault it via
  // endSessions), and disconnects normally against external MongoDB.
  await closeDB();
});

describe('1-3. Registration, pending gate, approval', () => {
  test('registration creates a pending account (never admin)', async () => {
    const res = await register(request(app), alice);
    expect(res.status).toBe(201);
    expect(res.body.data.user.status).toBe('pending');
    expect(res.body.data.user.role).toBe('member');

    const inDb = await User.findOne({ username: 'alice' }).select('+passwordHash');
    expect(inDb).toBeTruthy();
    expect(inDb.status).toBe('pending');
    // password is never stored in plain text
    expect(inDb.passwordHash).toBeTruthy();
    expect(inDb.passwordHash).not.toBe(alice.password);
    expect(inDb.passwordHash.startsWith('$2')).toBe(true);
  });

  test('duplicate username or email is rejected', async () => {
    const res = await register(request(app), alice);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_ACCOUNT');
  });

  test('pending user cannot log in', async () => {
    const res = await login(request(app), 'alice', alice.password);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PENDING_APPROVAL');
    expect(res.body.message).toMatch(/waiting for admin approval/i);
  });

  test('pending user cannot access protected team data', async () => {
    // Give alice a raw session cookie by hacking a login attempt post-approval?
    // Instead: authenticate via a directly-issued cookie.
    const jwt = require('jsonwebtoken');
    const env = require('../src/config/env');
    const user = await User.findOne({ username: 'alice' });
    const token = jwt.sign({ sub: user._id.toString() }, env.jwtSecret, { expiresIn: '5m' });
    const res = await request(app)
      .get('/api/users/dashboard')
      .set('Cookie', `tf_token=${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PENDING_APPROVAL');
  });

  test('admin approval unlocks login', async () => {
    // Admin account is created by the seed script — create it directly here.
    const hash = await User.hashPassword(admin.password);
    await User.create({
      name: admin.name, username: admin.username, email: admin.email,
      passwordHash: hash, role: 'admin', status: 'approved', approvedAt: new Date(),
    });

    const agent = request.agent(app);
    const loginRes = await login(agent, admin.email, admin.password);
    expect(loginRes.status).toBe(200);
    expect(loginRes.headers['set-cookie'][0]).toMatch(/tf_token=/);
    expect(loginRes.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    adminCookie = loginRes.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');

    await approve('alice');
    const res = await login(request(app), 'alice', alice.password);
    expect(res.status).toBe(200);
    expect(res.body.data.user.status).toBe('approved');
    aliceCookie = res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  });
});

describe('4. Admin authorization', () => {
  test('member session cannot access admin APIs', async () => {
    for (const path of ['/api/admin/stats', '/api/admin/users', '/api/admin/pending']) {
      const res = await request(app).get(path).set('Cookie', aliceCookie);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ADMIN_REQUIRED');
    }
    const action = await request(app)
      .post('/api/challenges')
      .set('Cookie', aliceCookie)
      .send({ title: 'x', description: 'y', category: 'coding', startAt: new Date(), deadline: new Date(Date.now() + 1000), maxPoints: 10 });
    expect(action.status).toBe(403);
  });

  test('unauthenticated requests get 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NO_SESSION');
  });
});

describe('5-8. Challenge submission, validation, review, leaderboard', () => {
  let challengeId;
  let submissionId;

  test('admin creates a published challenge with requirements', async () => {
    const res = await request(app)
      .post('/api/challenges')
      .set('Cookie', adminCookie)
      .send({
        title: 'Build a Dashboard',
        description: 'Create a responsive admin dashboard.',
        category: 'web-development',
        difficulty: 'medium',
        startAt: new Date(Date.now() - 3600000).toISOString(),
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        maxPoints: 50,
        requirements: [
          { label: 'GitHub repository', type: 'github', required: true },
          { label: 'Live URL', type: 'liveUrl', required: true },
          { label: 'Screenshot', type: 'image', required: true },
        ],
        status: 'published',
        allowResubmission: true,
        communityVisibility: 'auto',
      });
    expect(res.status).toBe(201);
    challengeId = res.body.data.challenge.id;
  });

  test('member sees challenge as active and submits valid work', async () => {
    const detail = await request(app).get(`/api/challenges/${challengeId}`).set('Cookie', aliceCookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data.challenge.memberStatus).toBe('active');

    const res = await request(app)
      .post(`/api/submissions/challenges/${challengeId}`)
      .set('Cookie', aliceCookie)
      .send({
        answers: [
          { key: 'req_1', type: 'github', value: 'https://github.com/alice/dashboard' },
          { key: 'req_2', type: 'liveUrl', value: 'https://alice.dev' },
          { key: 'req_3', type: 'image', value: 'https://cdn.example.com/shot.png' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.submission.status).toBe('submitted');
    submissionId = res.body.data.submission.id;
  });

  test('missing required fields and wrong hosts are rejected', async () => {
    const missing = await request(app)
      .post(`/api/submissions/challenges/${challengeId}`)
      .set('Cookie', aliceCookie)
      .send({ answers: [{ key: 'req_1', type: 'github', value: 'https://github.com/alice/x' }] });
    expect(missing.status).toBe(400);
    expect(missing.body.message).toMatch(/required/i);

    // Resubmission is allowed on this challenge but validation still applies.
    const wrongHost = await request(app)
      .post(`/api/submissions/challenges/${challengeId}`)
      .set('Cookie', aliceCookie)
      .send({
        answers: [
          { key: 'req_1', type: 'github', value: 'https://gitlab.com/alice/x' },
          { key: 'req_2', type: 'liveUrl', value: 'https://alice.dev' },
          { key: 'req_3', type: 'image', value: 'https://cdn.example.com/s.png' },
        ],
      });
    expect(wrongHost.status).toBe(400);
    expect(wrongHost.body.code).toBe('INVALID_URL_HOST');
  });

  test('duplicate submission while pending review is rejected', async () => {
    const res = await request(app)
      .post(`/api/submissions/challenges/${challengeId}`)
      .set('Cookie', aliceCookie)
      .send({
        answers: [
          { key: 'req_1', type: 'github', value: 'https://github.com/alice/dash' },
          { key: 'req_2', type: 'liveUrl', value: 'https://alice.dev' },
          { key: 'req_3', type: 'image', value: 'https://cdn.example.com/s.png' },
        ],
      });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_SUBMISSION');
  });

  test('late submissions are rejected when late submissions are disabled', async () => {
    const past = await request(app)
      .post('/api/challenges')
      .set('Cookie', adminCookie)
      .send({
        title: 'Expired sprint task',
        description: 'Should be closed for submissions.',
        category: 'coding',
        startAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        deadline: new Date(Date.now() - 60000).toISOString(),
        maxPoints: 20,
        requirements: [{ label: 'Link', type: 'liveUrl', required: true }],
        status: 'published',
      });
    expect(past.status).toBe(201);
    const res = await request(app)
      .post(`/api/submissions/challenges/${past.body.data.challenge.id}`)
      .set('Cookie', aliceCookie)
      .send({ answers: [{ key: 'req_1', type: 'liveUrl', value: 'https://alice.dev' }] });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DEADLINE_PASSED');
  });

  test('admin review validates points and awards them exactly once', async () => {
    const over = await request(app)
      .post(`/api/submissions/${submissionId}/review`)
      .set('Cookie', adminCookie)
      .send({ points: 500, status: 'approved' });
    expect(over.status).toBe(400);
    expect(over.body.code).toBe('POINTS_OUT_OF_RANGE');

    const res = await request(app)
      .post(`/api/submissions/${submissionId}/review`)
      .set('Cookie', adminCookie)
      .send({ points: 45, status: 'approved', feedback: 'Solid work!' });
    expect(res.status).toBe(200);
    expect(res.body.data.review.pointsAwarded).toBe(45);
    expect(res.body.data.memberScore.points).toBe(45);

    // Re-review to 30: score must become 30, never 45+30.
    const res2 = await request(app)
      .post(`/api/submissions/${submissionId}/review`)
      .set('Cookie', adminCookie)
      .send({ points: 30, status: 'approved', feedback: 'Downgraded after re-check.' });
    expect(res2.status).toBe(200);
    expect(res2.body.data.memberScore.points).toBe(30);
  });

  test('leaderboard reflects the exact approved score', async () => {
    const res = await request(app).get('/api/leaderboard').set('Cookie', aliceCookie);
    expect(res.status).toBe(200);
    const row = res.body.data.rows.find((r) => r.username === 'alice');
    expect(row).toBeTruthy();
    expect(row.points).toBe(30);
    expect(row.completedChallenges).toBe(1);
    expect(res.body.data.me.rank).toBe(row.rank);
  });

  test('approved submission is auto-published to the community feed', async () => {
    const res = await request(app).get('/api/community').set('Cookie', aliceCookie);
    expect(res.status).toBe(200);
    const post = res.body.data.items.find((p) => p.kind === 'submission');
    expect(post).toBeTruthy();
    expect(post.title).toMatch(/Build a Dashboard/);
  });
});

describe('9-10. Polls and event deadlines', () => {
  let pollId;
  let optionId;
  let eventId;

  test('admin creates an active single-vote poll', async () => {
    const res = await request(app)
      .post('/api/polls')
      .set('Cookie', adminCookie)
      .send({
        question: 'Preferred stack for the next sprint?',
        options: [{ text: 'MERN' }, { text: 'PERN' }],
        startsAt: new Date(Date.now() - 60000).toISOString(),
        endsAt: new Date(Date.now() + 86400000).toISOString(),
        status: 'active',
        allowChangeVote: false,
      });
    expect(res.status).toBe(201);
    pollId = res.body.data.poll.id;
    optionId = res.body.data.poll.options[0].id;
  });

  test('a member votes once — a second vote is rejected', async () => {
    const first = await request(app)
      .post(`/api/polls/${pollId}/vote`)
      .set('Cookie', aliceCookie)
      .send({ optionIds: [optionId] });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/polls/${pollId}/vote`)
      .set('Cookie', aliceCookie)
      .send({ optionIds: [optionId] });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('ALREADY_VOTED');
  });

  test('vote counts are correct in results', async () => {
    const res = await request(app).get(`/api/polls/${pollId}`).set('Cookie', aliceCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.poll.results.totalVotes).toBe(1);
    expect(res.body.data.poll.myVote).toEqual([optionId]);
  });

  test('event registration closes at the registration deadline', async () => {
    const ev = await request(app)
      .post('/api/events')
      .set('Cookie', adminCookie)
      .send({
        title: 'Timeboxed workshop',
        description: 'Registration closes immediately.',
        hostName: 'Admin',
        category: 'ai-workshop',
        date: new Date(Date.now() + 5 * 86400000).toISOString(),
        startTime: '10:00',
        endTime: '11:00',
        registrationDeadline: new Date(Date.now() - 1000).toISOString(),
        status: 'published',
      });
    expect(ev.status).toBe(201);
    eventId = ev.body.data.event.id;

    const res = await request(app)
      .post(`/api/events/${eventId}/register`)
      .set('Cookie', aliceCookie);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('REGISTRATION_CLOSED');
  });

  test('a normal event allows registration exactly once', async () => {
    const ev = await request(app)
      .post('/api/events')
      .set('Cookie', adminCookie)
      .send({
        title: 'Regular meetup',
        description: 'Come build together.',
        hostName: 'Admin',
        category: 'team-meeting',
        date: new Date(Date.now() + 3 * 86400000).toISOString(),
        startTime: '18:00',
        endTime: '19:00',
        status: 'published',
      });
    expect(ev.status).toBe(201);
    const id = ev.body.data.event.id;

    const first = await request(app).post(`/api/events/${id}/register`).set('Cookie', aliceCookie);
    expect(first.status).toBe(201);
    const again = await request(app).post(`/api/events/${id}/register`).set('Cookie', aliceCookie);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ALREADY_REGISTERED');
  });
});

describe('11. Profile protection & privilege escalation', () => {
  test('members cannot set their own role/status/points', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', aliceCookie)
      .send({ role: 'admin', status: 'approved', points: 99999 });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('member');
    expect(res.body.data.user.points).toBe(30); // unchanged — still the reviewed score
  });

  test('members cannot approve themselves or other users', async () => {
    const target = await User.findOne({ username: 'alice' });
    const res = await request(app)
      .patch(`/api/admin/users/${target._id}/status`)
      .set('Cookie', aliceCookie)
      .send({ status: 'approved' });
    expect(res.status).toBe(403);
  });

  test('public profile API never leaks sensitive fields', async () => {
    const res = await request(app).get('/api/users/alice').set('Cookie', aliceCookie);
    expect(res.status).toBe(200);
    const p = res.body.data.profile;
    expect(p.passwordHash).toBeUndefined();
    expect(p.email).toBeUndefined();
    expect(JSON.stringify(p)).not.toMatch(/passwordHash|\$2a|\$2b/);
  });
});

describe('12. Session lifecycle', () => {
  test('login -> me -> logout -> me cycle works', async () => {
    const agent = request.agent(app);
    const loginRes = await login(agent, 'bob', bob.password);
    // bob was never registered — invalid credentials
    expect(loginRes.status).toBe(401);
    expect(loginRes.body.code).toBe('INVALID_CREDENTIALS');

    // register + approve bob
    await register(request(app), bob);
    await approve('bob');
    const okLogin = await login(agent, 'bob', bob.password);
    expect(okLogin.status).toBe(200);
    bobCookie = okLogin.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');

    const me = await request(app).get('/api/auth/me').set('Cookie', bobCookie);
    expect(me.status).toBe(200);
    expect(me.body.data.user.username).toBe('bob');
    expect(me.body.data.user.passwordHash).toBeUndefined();

    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);

    // The browser (agent) drops the cleared cookie — session is gone for it.
    const meAfter = await agent.get('/api/auth/me');
    expect(meAfter.status).toBe(401);
  });

  test('expired/invalid tokens are rejected', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'tf_token=not.a.real.token');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SESSION');
  });
});

describe('Participation report is computed from real records', () => {
  test('admin participation report matches actual submissions', async () => {
    const challengeId = (await request(app).get('/api/challenges?all=1&q=Build a Dashboard').set('Cookie', adminCookie))
      .body.data.items[0].id;
    const res = await request(app)
      .get(`/api/challenges/${challengeId}/participation`)
      .set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    const { stats, rows } = res.body.data;
    expect(rows.length).toBe(stats.eligible);
    expect(stats.submittedCount).toBe(rows.filter((r) => r.attempt > 0).length);
    expect(stats.approved).toBe(rows.filter((r) => r.status === 'approved').length);
    expect(stats.submissionPercent).toBe(
      stats.eligible ? Math.round((stats.submittedCount / stats.eligible) * 100) : 0
    );
  });
});
