/**
 * End-to-end backend verification.
 *
 *   npm test               # boots the in-memory dev MongoDB + API and exercises every endpoint
 *   npm test -- --verbose  # prints each check
 *
 * Covers: auth (register/login/logout/session), authorization (admin guards),
 * challenges (list/detail/filter/CRUD), submissions (scoring, attempts limit,
 * XP, streaks, achievements), profile/stats/leaderboard and the admin APIs.
 */
import assert from 'node:assert/strict';
import { MemoryMongo } from './dev-mongo/memory-mongo.js';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27019/learnai-verify';
process.env.JWT_SECRET = 'verify-secret-do-not-use-in-production';
process.env.RATE_LIMITS_ENABLED = 'false';
process.env.MEMORY_MONGO_PORT = '27019';

const verbose = process.argv.includes('--verbose') || process.env.VERBOSE === '1';
const results = [];
let server;
let baseUrl;

function log(message) {
  if (verbose) console.log(`   ${message}`);
}

async function check(name, fn) {
  try {
    const value = await fn();
    results.push({ name, ok: true });
    console.log(`✅ ${name}`);
    return value;
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(`❌ ${name}\n     ${error.message}`);
    return null;
  }
}

/** Tiny cookie-aware fetch client. */
function createClient() {
  let cookie = '';
  return async function client(method, path, body, { token = null, headers = {} } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    const setCookie = response.headers.getSetCookie?.() ?? [];
    for (const entry of setCookie) {
      const [pair] = entry.split(';');
      const [name] = pair.split('=');
      if (name === 'learnai_token') cookie = entry.includes('Max-Age=0') ? '' : pair;
    }
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    return { status: response.status, body: json, headers: response.headers, raw: text, cookie };
  };
}

async function main() {
  const memoryMongo = new MemoryMongo({ port: 27019, logger: (m) => verbose && console.log(m) });
  await memoryMongo.listen();

  const { connectDatabase } = await import('../config/db.js');
  await connectDatabase(process.env.MONGO_URI);

  const { seed } = await import('../seed/index.js');
  const summary = await seed({ fresh: true });
  assert.equal(summary.challenges.created, 12, 'expected 12 seeded challenges');

  const { createApp } = await import('../app.js');
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  console.log(`\nVerifying ${baseUrl} (memory MongoDB on :27019)\n`);

  const c = createClient();

  /* ---------------- health ---------------- */
  await check('health endpoint reports a connected database', async () => {
    const { status, body } = await c('GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(body.data.database.state, 'connected');
    assert.ok(body.data.execution.some((provider) => provider.active));
  });

  /* ---------------- auth ---------------- */
  const registered = await check('register creates a user and sets an HTTP-only cookie', async () => {
    const { status, body, headers } = await c('POST', '/api/auth/register', {
      name: 'Verification User',
      username: 'verify_user',
      email: 'verify@learnai.dev',
      password: 'Practice123',
    });
    assert.equal(status, 201, JSON.stringify(body));
    assert.equal(body.data.user.username, 'verify_user');
    assert.equal(body.data.user.role, 'user');
    assert.ok(body.data.user.avatar.startsWith('data:image/svg+xml'), 'avatar should be a generated SVG');
    const setCookie = (headers.getSetCookie?.() ?? []).join(';');
    assert.match(setCookie, /HttpOnly/i);
    assert.ok(!('password' in body.data.user), 'password must never be serialised');
    return body.data.user;
  });

  await check('register rejects weak passwords', async () => {
    const { status, body } = await c('POST', '/api/auth/register', {
      name: 'Weak Pass',
      username: 'weak_pass',
      email: 'weak@learnai.dev',
      password: 'short',
    });
    assert.equal(status, 422);
    assert.equal(body.success, false);
  });

  await check('register rejects duplicate usernames', async () => {
    const client = createClient();
    const { status } = await client('POST', '/api/auth/register', {
      name: 'Duplicate',
      username: 'verify_user',
      email: 'another@learnai.dev',
      password: 'Practice123',
    });
    assert.equal(status, 409);
  });

  await check('invalid credentials are rejected', async () => {
    const { status } = await c('POST', '/api/auth/login', { identifier: 'verify_user', password: 'WrongPass1' });
    assert.equal(status, 401);
  });

  await check('login works with username and with email', async () => {
    const byUsername = createClient();
    const first = await byUsername('POST', '/api/auth/login', { identifier: 'verify_user', password: 'Practice123' });
    assert.equal(first.status, 200);
    const byEmail = createClient();
    const second = await byEmail('POST', '/api/auth/login', { identifier: 'verify@learnai.dev', password: 'Practice123' });
    assert.equal(second.status, 200);
  });

  await check('GET /auth/me returns the session user with stats', async () => {
    const { status, body } = await c('GET', '/api/auth/me');
    assert.equal(status, 200);
    assert.equal(body.data.user.username, 'verify_user');
    assert.ok(body.data.stats.level >= 1);
  });

  await check('protected routes reject anonymous access', async () => {
    const anonymous = createClient();
    const me = await anonymous('GET', '/api/auth/me');
    assert.equal(me.status, 401);
    const admin = await anonymous('GET', '/api/admin/stats');
    assert.equal(admin.status, 401);
    const submission = await anonymous('POST', '/api/submissions', { challengeId: 'x' });
    assert.equal(submission.status, 401);
  });

  await check('logout clears the auth cookie', async () => {
    const client = createClient();
    await client('POST', '/api/auth/login', { identifier: 'verify_user', password: 'Practice123' });
    const before = await client('GET', '/api/auth/me');
    assert.equal(before.status, 200);
    const out = await client('POST', '/api/auth/logout');
    assert.equal(out.status, 200);
    const after = await client('GET', '/api/auth/me');
    assert.equal(after.status, 401, 'session should end after logout');
  });

  /* ---------------- challenges ---------------- */
  const challengeList = await check('GET /api/challenges returns the catalogue with facets', async () => {
    const { status, body } = await c('GET', '/api/challenges');
    assert.equal(status, 200);
    assert.equal(body.data.length, 12);
    assert.equal(body.meta.facets.categories.length, 3);
    const categories = [...new Set(body.data.map((item) => item.category))];
    assert.deepEqual(categories.sort(), ['CSS', 'HTML', 'JavaScript']);
    return body.data;
  });

  await check('challenge filters work (category, difficulty, search)', async () => {
    const css = await c('GET', '/api/challenges?category=CSS');
    assert.equal(css.body.data.length, 4);
    const hard = await c('GET', '/api/challenges?difficulty=Hard');
    assert.ok(hard.body.data.length >= 1);
    const search = await c('GET', '/api/challenges?search=counter');
    assert.ok(search.body.data.some((item) => item.slug === 'counter'));
  });

  await check('GET /api/challenges/:id works with both id and slug', async () => {
    const byId = await c('GET', `/api/challenges/${challengeList[0].id}`);
    assert.equal(byId.status, 200);
    const bySlug = await c('GET', '/api/challenges/counter');
    assert.equal(bySlug.status, 200);
    assert.ok(bySlug.body.data.instructions.length > 0);
    assert.ok(Array.isArray(bySlug.body.data.requiredTests));
    assert.ok(!('testCases' in bySlug.body.data), 'test assertions must not leak in the workspace payload');
    const missing = await c('GET', '/api/challenges/does-not-exist');
    assert.equal(missing.status, 404);
  });

  await check('sandbox ticket is issued for measured challenges', async () => {
    const { body } = await c('GET', '/api/challenges/counter');
    assert.ok(body.data.runtimeSpec.measurements.length >= 1);
    assert.ok(typeof body.data.sandbox.ticket === 'string' && body.data.sandbox.ticket.split('.').length === 3);
  });

  await check('only admins can create challenges', async () => {
    const forbidden = await c('POST', '/api/challenges', {
      title: 'Hack',
      description: 'nope',
      category: 'HTML',
      difficulty: 'Easy',
      instructions: ['x'],
      testCases: [{ id: 'a', name: 'a', group: 'html', type: 'html-selector', selector: 'div', operator: 'exists' }],
    });
    assert.equal(forbidden.status, 403);
  });

  /* ---------------- submissions & scoring ---------------- */
  const counter = challengeList.find((item) => item.slug === 'counter');
  const profileCard = challengeList.find((item) => item.slug === 'profile-card');

  const goodCounterCode = {
    html: `<section class="counter-card" data-state="zero"><h2 class="counter-title">Counter</h2><span id="count" class="counter-value">0</span><div class="counter-actions"><button id="decrement" type="button" aria-label="Decrease">−</button><button id="reset" type="button">Reset</button><button id="increment" type="button" aria-label="Increase">+</button></div></section>`,
    css: `.counter-card { display: flex; flex-direction: column; gap: 1rem; align-items: center; padding: 2rem; border-radius: 16px; }
.counter-value { font-size: 3rem; }
.counter-actions { display: flex; gap: 0.5rem; }
button { padding: 0.75rem 1.25rem; }
@media (max-width: 480px) { .counter-card { gap: 0.5rem; } }`,
    js: `const card = document.querySelector('.counter-card');
const countEl = document.querySelector('#count');
const increment = document.querySelector('#increment');
const decrement = document.querySelector('#decrement');
const reset = document.querySelector('#reset');
let value = 0;
function render() {
  countEl.textContent = String(value);
  card.setAttribute('data-state', value === 0 ? 'zero' : 'positive');
  decrement.disabled = value === 0;
}
increment.addEventListener('click', () => { value += 1; render(); });
decrement.addEventListener('click', () => { value = Math.max(0, value - 1); render(); });
reset.addEventListener('click', () => { value = 0; render(); });
render();`,
  };

  const firstSubmission = await check('submission scores deterministically and awards XP', async () => {
    const workspace = await c('GET', '/api/challenges/counter');
    const { status, body } = await c('POST', '/api/submissions', {
      challengeId: counter.id,
      htmlCode: goodCounterCode.html,
      cssCode: goodCounterCode.css,
      jsCode: goodCounterCode.js,
      timeTaken: 420,
      sandboxTicket: workspace.body.data.sandbox.ticket,
      observations: {
        measurements: {
          'counter-behaviour': { values: { ready: true, initial: '0', afterThreeIncrements: '3', afterDecrement: '2', clampedAtZero: '0', afterReset: '0', zeroState: 'zero' } },
          'counter-responsive-targets': { values: { buttonCount: 3, minHeight: 44, overflow: 0 } },
        },
      },
    });
    assert.equal(status, 201, JSON.stringify(body));
    const result = body.data.result;
    assert.ok(result.score >= 70, `expected a passing score, got ${result.score}`);
    assert.equal(result.totalTests, body.data.breakdown.testResults.length);
    assert.ok(result.testsPassed > 0);
    assert.equal(result.attemptNumber, 1);
    assert.equal(result.timeTakenLabel, '07:00');
    assert.ok(result.xpEarned > 0, 'first submission should award XP');
    assert.equal(body.data.attempts.label, 'Attempts: 1 / 3');
    assert.ok(body.data.user.level >= 1);
    assert.equal(body.data.submission.status, result.passed ? 'passed' : 'failed');
    assert.ok(body.data.verification.sandboxVerifiedTests >= 1, 'sandbox measurements should be recorded');
    return body.data;
  });

  await check('score equals the sum of the rubric groups', async () => {
    const { groups, categoryScores } = { groups: firstSubmission.breakdown.groups, categoryScores: firstSubmission.breakdown.categoryScores };
    const sum = groups.reduce((total, group) => total + group.earned, 0);
    assert.equal(sum, firstSubmission.result.score);
    assert.equal(Object.values(categoryScores).reduce((total, entry) => total + entry.max, 0), 100, 'rubric maxima must add up to 100');
  });

  await check('attempt numbers increment and the limit is enforced', async () => {
    const second = await c('POST', '/api/submissions', {
      challengeId: counter.id,
      htmlCode: goodCounterCode.html,
      cssCode: goodCounterCode.css,
      jsCode: goodCounterCode.js,
      timeTaken: 60,
      observations: {
        measurements: {
          'counter-behaviour': { values: { ready: true, initial: '0', afterThreeIncrements: '3', afterDecrement: '2', clampedAtZero: '0', afterReset: '0' } },
          'counter-responsive-targets': { values: { buttonCount: 3, minHeight: 44, overflow: 0 } },
        },
      },
    });
    assert.equal(second.status, 201);
    assert.equal(second.body.data.result.attemptNumber, 2);
    assert.ok(second.body.data.result.xpEarned <= firstSubmission.result.xpEarned, 'repeat attempts must not farm XP');
    assert.equal(second.body.data.attempts.used, 2);
  });

  await check('submission rejects unknown challenges and missing code', async () => {
    const missingChallenge = await c('POST', '/api/submissions', { challengeId: '0123456789abcdef01234567', htmlCode: '<p>x</p>' });
    assert.equal(missingChallenge.status, 404);
    const empty = await c('POST', '/api/submissions', { challengeId: counter.id, htmlCode: '', cssCode: '', jsCode: '' });
    assert.equal(empty.status, 422);
  });

  await check('missing sandbox measurements fail only the measured tests', async () => {
    const { body } = await c('POST', '/api/submissions', {
      challengeId: counter.id,
      htmlCode: goodCounterCode.html,
      cssCode: goodCounterCode.css,
      jsCode: goodCounterCode.js,
      timeTaken: 30,
    });
    const measured = body.data.breakdown.testResults.filter((test) => test.verifiedBy !== 'server');
    assert.ok(measured.length >= 1);
    assert.ok(measured.every((test) => !test.passed), 'measured tests must fail without measurements');
    assert.ok(body.data.breakdown.testResults.some((test) => test.verifiedBy === 'server' && test.passed), 'static tests still pass');
  });

  await check('attempt limit blocks the fourth submission', async () => {
    // Three attempts have been used by the checks above (maxAttempts = 3).
    const blocked = await c('POST', '/api/submissions', {
      challengeId: counter.id,
      htmlCode: goodCounterCode.html,
      cssCode: goodCounterCode.css,
      jsCode: goodCounterCode.js,
      timeTaken: 30,
    });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error.code, 'ATTEMPT_LIMIT_REACHED');
    assert.equal(blocked.body.error.details.maxAttempts, 3);
    assert.equal(blocked.body.error.details.attemptsUsed, 3);

    const attemptState = await c('GET', `/api/challenges/${counter.id}`);
    assert.equal(attemptState.body.data.attempts.used, 3);
    assert.equal(attemptState.body.data.attempts.exhausted, true);
    assert.equal(attemptState.body.data.attempts.label, 'Attempts: 3 / 3');
  });

  await check('streak, XP and achievements update after submissions', async () => {
    const { body } = await c('GET', '/api/users/me/stats');
    assert.ok(body.data.xp > 0);
    assert.equal(body.data.currentStreak, 1, 'a single practice day is a 1 day streak');
    assert.equal(body.data.practicedToday, true);
    assert.ok(body.data.submissions >= 3);
    assert.ok(body.data.categoryProgress.length === 3);
    assert.ok(body.data.recentSubmissions.length > 0);
    const achievements = await c('GET', '/api/users/me/achievements');
    const earned = achievements.body.data.items.filter((item) => item.earned).map((item) => item.key);
    assert.ok(earned.includes('first-challenge'), `expected the first-challenge achievement, got ${earned.join(',')}`);
    assert.ok(achievements.body.data.summary.total >= 12);
  });

  await check('submission history + single submission retrieval work', async () => {
    const history = await c('GET', '/api/submissions/me?limit=5');
    assert.equal(history.status, 200);
    assert.ok(history.body.data.length >= 3);
    assert.ok(history.body.meta.total >= 3);
    const id = history.body.data[0].id;
    const detail = await c('GET', `/api/submissions/${id}`);
    assert.equal(detail.status, 200);
    assert.ok(detail.body.data.htmlCode.length > 0);
    assert.ok(detail.body.data.testResults.length > 0);

    const other = createClient();
    await other('POST', '/api/auth/login', { identifier: 'maya', password: 'Practice@123' });
    const forbidden = await other('GET', `/api/submissions/${id}`);
    assert.equal(forbidden.status, 403, 'users must not read other submissions');
  });

  /* ---------------- profile ---------------- */
  await check('profile stats expose XP, level progress and category progress', async () => {
    const { body } = await c('GET', '/api/users/me');
    const stats = body.data.stats;
    assert.ok(stats.levelProgress.nextLevelXp > stats.levelProgress.currentLevelXp);
    assert.equal(typeof stats.averageScore, 'number');
    assert.equal(stats.rank >= 1, true);
    assert.ok(body.data.user.email === 'verify@learnai.dev');
    assert.ok(!('password' in body.data.user));
  });

  await check('profile update persists name, bio and preferences', async () => {
    const { status, body } = await c('PUT', '/api/users/me', {
      name: 'Verified Dev',
      bio: 'Practising every day.',
      preferences: { editorFontSize: 16, editorTheme: 'dark', tabSize: 4, autoRun: true },
    });
    assert.equal(status, 200);
    assert.equal(body.data.user.name, 'Verified Dev');
    assert.equal(body.data.user.preferences.editorFontSize, 16);
    const me = await c('GET', '/api/auth/me');
    assert.equal(me.body.data.user.bio, 'Practising every day.');
  });

  await check('public profile is readable and hides other users source code', async () => {
    const { status, body } = await c('GET', '/api/users/maya');
    assert.equal(status, 200);
    assert.equal(body.data.user.username, 'maya');
    assert.ok(body.data.stats.xp > 0);
    assert.ok(body.data.submissions.every((entry) => entry.canViewCode === false));
    assert.ok(!('password' in body.data.user));
  });

  await check('activity calendar aggregates practice days', async () => {
    const { body } = await c('GET', '/api/users/me/activity?days=30');
    assert.equal(body.data.calendar.length, 31);
    assert.ok(body.data.summary.totalSubmissions >= 3);
    assert.ok(body.data.calendar.some((day) => day.level > 0));
  });

  await check('password change verifies the current password', async () => {
    const wrong = await c('PATCH', '/api/auth/password', { currentPassword: 'nope', newPassword: 'Newpass123' });
    assert.equal(wrong.status, 401);
    const ok = await c('PATCH', '/api/auth/password', { currentPassword: 'Practice123', newPassword: 'Newpass123' });
    assert.equal(ok.status, 200);
    const relogin = createClient();
    const login = await relogin('POST', '/api/auth/login', { identifier: 'verify_user', password: 'Newpass123' });
    assert.equal(login.status, 200);
  });

  /* ---------------- leaderboard ---------------- */
  await check('leaderboard ranks users for every period', async () => {
    for (const period of ['weekly', 'monthly', 'all-time']) {
      const { status, body } = await c('GET', `/api/leaderboard?period=${period}&limit=10`);
      assert.equal(status, 200, `period ${period}`);
      assert.ok(body.data.length > 0, `period ${period} should have entries`);
      const ranks = body.data.map((entry) => entry.rank);
      assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), 'ranks must be ascending');
      assert.ok(body.data[0].xp >= body.data[body.data.length - 1].xp);
      assert.ok(body.data.every((entry) => typeof entry.averageScore === 'number' && typeof entry.challengesSolved === 'number'));
      assert.equal(body.meta.period, period);
    }
    const withUser = await c('GET', '/api/leaderboard?period=all-time');
    const me = withUser.body.meta.me;
    assert.ok(me && me.isCurrentUser, 'the response should highlight the current user');
    const invalid = await c('GET', '/api/leaderboard?period=daily');
    assert.equal(invalid.status, 400);
  });

  await check('leaderboard preview is public', async () => {
    const anonymous = createClient();
    const { status, body } = await anonymous('GET', '/api/leaderboard/preview');
    assert.equal(status, 200);
    assert.ok(body.data.entries.length > 0);
  });

  /* ---------------- achievements ---------------- */
  await check('achievement catalogue is public and tracks progress when signed in', async () => {
    const anonymous = createClient();
    const publicView = await anonymous('GET', '/api/achievements');
    assert.equal(publicView.status, 200);
    assert.ok(publicView.body.data.items.length >= 12);
    assert.ok(publicView.body.data.items.every((item) => item.earned === false));

    const authed = await c('GET', '/api/achievements');
    assert.ok(authed.body.data.items.some((item) => item.progress.threshold > 0));
    assert.ok(authed.body.data.summary.completionPercent >= 0);
  });

  /* ---------------- admin ---------------- */
  const adminClient = createClient();
  await check('admin login succeeds', async () => {
    const { status, body } = await adminClient('POST', '/api/auth/login', { identifier: 'admin', password: 'Admin@12345' });
    assert.equal(status, 200);
    assert.equal(body.data.user.role, 'admin');
  });

  await check('a perfect solution scores exactly 100 and unlocks the perfect-score achievement', async () => {
    const created = await adminClient('POST', '/api/challenges', {
      title: 'Perfect Score Probe',
      description: 'Temporary challenge used to verify the 100 point ceiling.',
      category: 'HTML',
      difficulty: 'Easy',
      instructions: ['Add a heading with class "title" and a button with id "go".'],
      testCases: [
        { id: 'probe-heading', name: 'Heading exists', group: 'html', type: 'html-selector', selector: 'h1.title', operator: 'exists', weight: 4 },
        { id: 'probe-button', name: 'Button exists', group: 'html', type: 'html-selector', selector: 'button#go', operator: 'exists', weight: 3 },
        { id: 'probe-style', name: 'Heading styled', group: 'css', type: 'css-declaration', selector: '.title', property: 'color', operator: 'exists', weight: 3 },
        { id: 'probe-quality', name: 'No inline styles', group: 'codeQuality', type: 'code-quality', check: 'no-inline-style', weight: 2 },
      ],
    });
    const probe = created.body.data;
    const submission = await c('POST', '/api/submissions', {
      challengeId: probe.id,
      htmlCode: '<main><h1 class="title">Perfect</h1><button id="go" type="button">Go</button></main>',
      cssCode: '.title { color: #4f46e5; font-size: 2rem; }\n@media (max-width: 600px) { .title { font-size: 1.5rem; } }',
      jsCode: 'const go = document.querySelector("#go");\ngo.addEventListener("click", () => { go.textContent = "Done"; });',
      timeTaken: 120,
    });
    await adminClient('DELETE', `/api/challenges/${probe.id}?force=true`);

    assert.equal(submission.status, 201, JSON.stringify(submission.body));
    assert.equal(submission.body.data.result.score, 100);
    assert.equal(submission.body.data.result.isPerfect, true);
    assert.equal(submission.body.data.result.status, 'passed');
    const rubric = submission.body.data.breakdown.groups.filter((group) => group.totalTests > 0);
    assert.ok(rubric.every((group) => group.earned === group.max), 'every active group should be fully earned');
    assert.equal(rubric.reduce((total, group) => total + group.max, 0), 100);
    assert.ok(submission.body.data.result.bonuses.some((bonus) => bonus.key === 'perfect-score'));

    // The achievement is either unlocked by this submission or was already unlocked.
    const overview = await c('GET', '/api/users/me/achievements');
    const perfect = overview.body.data.items.find((item) => item.key === 'perfect-score');
    assert.ok(perfect?.earned, 'the perfect-score achievement should be unlocked');
    assert.ok(overview.body.data.summary.earned >= 1);
    return submission.body.data;
  });

  await check('non-admins cannot access admin endpoints', async () => {
    const { status } = await c('GET', '/api/admin/users');
    assert.equal(status, 403);
  });

  await check('admin dashboard stats aggregate platform data', async () => {
    const { status, body } = await adminClient('GET', '/api/admin/stats');
    assert.equal(status, 200);
    assert.ok(body.data.users.total >= 7);
    assert.equal(body.data.challenges.total, 12);
    assert.ok(body.data.submissions.total >= 40, 'seeded demo activity should exist');
    assert.ok(body.data.popularCategories.length === 3);
    assert.ok(body.data.dailyActivity.length > 0);
    assert.ok(body.data.execution.providers.length >= 1);
  });

  const createdChallenge = await check('admin can create, update and delete a challenge', async () => {
    const payload = {
      title: 'Verification Challenge',
      description: 'Created by the verification script.',
      category: 'CSS',
      difficulty: 'Easy',
      instructions: ['Make it work.'],
      starterHTML: '<div class="box"></div>',
      starterCSS: '.box { }',
      hints: ['hint'],
      testCases: [
        {
          id: 'box-display',
          name: 'Box uses flex',
          group: 'css',
          type: 'css-declaration',
          selector: '.box',
          property: 'display',
          operator: 'equals',
          value: 'flex',
          weight: 4,
        },
        { id: 'box-quality', name: 'Balanced CSS', group: 'codeQuality', type: 'code-quality', check: 'no-important', weight: 2 },
      ],
    };
    const created = await adminClient('POST', '/api/challenges', payload);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.slug, 'verification-challenge');
    assert.equal(created.body.data.testCases.length, 2);

    const updated = await adminClient('PUT', `/api/challenges/${created.body.data.id}`, { difficulty: 'Hard', xp: 200 });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.difficulty, 'Hard');

    const listed = await adminClient('GET', '/api/challenges?includeUnpublished=true');
    assert.equal(listed.body.data.length, 13);

    const removed = await adminClient('DELETE', `/api/challenges/${created.body.data.id}`);
    assert.equal(removed.status, 200, 'a challenge with no submissions deletes cleanly');

    // A challenge that has submissions is protected unless the admin forces it,
    // and forcing it must rewind the XP those submissions granted.
    const probe = await adminClient('POST', '/api/challenges', { ...payload, title: 'Submission Guard Probe' });
    const probeId = probe.body.data.id;
    const submission = await c('POST', '/api/submissions', {
      challengeId: probeId,
      htmlCode: '<div class="box"></div>',
      cssCode: '.box { display: flex; }',
      jsCode: '',
    });
    assert.equal(submission.status, 201, JSON.stringify(submission.body));
    const xpBefore = submission.body.data.user.xp;

    const guardedDelete = await adminClient('DELETE', `/api/challenges/${probeId}`);
    assert.equal(guardedDelete.status, 409);
    assert.equal(guardedDelete.body.error.code, 'CHALLENGE_HAS_SUBMISSIONS');
    assert.ok(guardedDelete.body.error.details.submissions >= 1);

    const forced = await adminClient('DELETE', `/api/challenges/${probeId}?force=true`);
    assert.equal(forced.status, 200);
    assert.ok(forced.body.data.affectedUsers >= 1, 'the submitter should be recalculated');

    const afterRewind = await c('GET', '/api/users/me/stats');
    assert.ok(afterRewind.body.data.xp < xpBefore, 'XP from the removed submissions must be rewound');

    return created.body.data;
  });

  await check('admin can list and manage users and submissions', async () => {
    const users = await adminClient('GET', '/api/admin/users?limit=50');
    assert.equal(users.status, 200);
    assert.ok(users.body.data.length >= 7);
    assert.ok(users.body.data.every((user) => !('password' in user)));

    const target = users.body.data.find((user) => user.username === 'tom');
    const promoted = await adminClient('PATCH', `/api/admin/users/${target.id}`, { role: 'admin' });
    assert.equal(promoted.status, 200);
    assert.equal(promoted.body.data.role, 'admin');
    const demoted = await adminClient('PATCH', `/api/admin/users/${target.id}`, { role: 'user' });
    assert.equal(demoted.body.data.role, 'user');

    const submissions = await adminClient('GET', '/api/admin/submissions?limit=10');
    assert.equal(submissions.status, 200);
    assert.ok(submissions.body.data.length > 0);
    assert.ok(submissions.body.data[0].user.username);

    const statistics = await adminClient('GET', '/api/admin/statistics?days=30');
    assert.equal(statistics.status, 200);
    assert.equal(statistics.body.data.categoryBreakdown.length, 3);
    assert.equal(statistics.body.data.scoreDistribution.length, 10);
    assert.ok(statistics.body.data.hardestChallenges.length > 0);

    const system = await adminClient('GET', '/api/admin/system');
    assert.equal(system.body.data.database.state, 'connected');
  });

  /* ---------------- progression maths ---------------- */
  await check('level thresholds are consistent with the XP curve', async () => {
    const { levelFromXp, xpForLevel, levelProgress } = await import('../services/xp.service.js');
    assert.equal(levelFromXp(0), 1);
    for (let level = 1; level <= 25; level += 1) {
      const threshold = xpForLevel(level);
      assert.equal(levelFromXp(threshold), level, `level ${level} should start exactly at ${threshold} XP`);
      if (threshold > 0) assert.equal(levelFromXp(threshold - 1), level - 1, `${threshold - 1} XP is still level ${level - 1}`);
    }
    const progress = levelProgress(1817);
    assert.equal(progress.xpForNextLevel, xpForLevel(progress.level + 1) - xpForLevel(progress.level));
    assert.ok(progress.xpIntoLevel >= 0 && progress.xpIntoLevel < progress.xpForNextLevel);
    assert.ok(progress.progressPercent >= 0 && progress.progressPercent <= 100);
  });

  await check('streaks advance on consecutive days and reset after a gap', async () => {
    const { computeStreakUpdate, streakStatus, daysBetween } = await import('../services/streak.service.js');
    const day = (offset) => new Date(Date.UTC(2026, 4, 10 - offset, 12, 0, 0));

    const first = computeStreakUpdate({ currentStreak: 0, longestStreak: 0, lastPracticeDate: null, now: day(0) });
    assert.equal(first.currentStreak, 1);
    assert.equal(first.longestStreak, 1);

    const sameDay = computeStreakUpdate({ currentStreak: 3, longestStreak: 3, lastPracticeDate: day(0), now: day(0) });
    assert.equal(sameDay.currentStreak, 3, 'a second submission on the same day keeps the streak');
    assert.equal(sameDay.isNewDay, false);

    const nextDay = computeStreakUpdate({ currentStreak: 3, longestStreak: 3, lastPracticeDate: day(1), now: day(0) });
    assert.equal(nextDay.currentStreak, 4);

    const gap = computeStreakUpdate({ currentStreak: 9, longestStreak: 9, lastPracticeDate: day(3), now: day(0) });
    assert.equal(gap.currentStreak, 1, 'a missed day resets the current streak');
    assert.equal(gap.longestStreak, 9, 'the longest streak is preserved');
    assert.equal(daysBetween(day(3), day(0)), 3);

    // A run that ended more than a day ago must not be reported as live.
    const stale = streakStatus({ currentStreak: 7, longestStreak: 7, lastPracticeDate: day(3) }, day(0));
    assert.equal(stale.currentStreak, 0);
    assert.equal(stale.practicedToday, false);
    const alive = streakStatus({ currentStreak: 7, longestStreak: 7, lastPracticeDate: day(1) }, day(0));
    assert.equal(alive.currentStreak, 7, 'yesterday keeps the streak alive (today is still open)');
    assert.equal(alive.atRisk, true);
  });

  await check('the seeded demo team has believable, consistent history', async () => {
    const [{ default: User }, { default: Submission }, { default: Challenge }] = await Promise.all([
      import('../models/User.js'),
      import('../models/Submission.js'),
      import('../models/Challenge.js'),
    ]);

    const users = await User.find({ role: 'user' }, '+password').lean();
    assert.ok(users.length >= 6, 'the seed should create the demo team');
    assert.ok(users.every((user) => user.password?.startsWith('$2')), 'seeded passwords must be hashed');

    const challenges = await Challenge.find({}, 'title maxAttempts xp difficulty').lean();
    const byId = new Map(challenges.map((challenge) => [String(challenge._id), challenge]));

    const submissions = await Submission.find({}).lean();
    assert.ok(submissions.length >= users.length * 3, 'seeded history should cover several submissions per member');

    // No submission may exceed the challenge attempt limit, and attempt numbers must be sequential.
    const attempts = new Map();
    for (const submission of [...submissions].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))) {
      const key = `${submission.userId}:${submission.challengeId}`;
      const next = (attempts.get(key) ?? 0) + 1;
      assert.equal(submission.attemptNumber, next, `attempt numbering broke for ${key}`);
      const challenge = byId.get(String(submission.challengeId));
      assert.ok(next <= (challenge?.maxAttempts ?? 3), `submission ${key} exceeded maxAttempts`);
      attempts.set(key, next);
      assert.ok(submission.score >= 0 && submission.score <= 100, 'scores stay in range');
      assert.equal(submission.status, submission.score >= 70 ? 'passed' : 'failed', `status must match the score (${submission.score})`);
    }

    // XP must equal the sum of submission awards plus achievement rewards.
    for (const user of users) {
      const earned = submissions
        .filter((submission) => String(submission.userId) === String(user._id))
        .reduce((sum, submission) => sum + (submission.xpEarned ?? 0), 0)
        + (user.achievementXp ?? 0);
      assert.equal(user.xp, earned, `${user.username}: XP total must match the activity log`);
      assert.equal(user.challengesSolved, user.solvedChallenges.length);
      assert.equal(user.totalScore, user.solvedChallenges.reduce((sum, entry) => sum + entry.score, 0));
      assert.equal(user.submissionsCount, submissions.filter((submission) => String(submission.userId) === String(user._id)).length);
    }

    const activeRecently = users.filter((user) => user.lastPracticeDate && (Date.now() - new Date(user.lastPracticeDate)) < 3 * 24 * 60 * 60 * 1000);
    assert.ok(activeRecently.length >= 2, 'at least two members should have practised in the last two days');

    const withStreak = users.filter((user) => user.currentStreak > 0);
    assert.ok(withStreak.length >= 1, 'at least one member should have a live streak');
    assert.ok(users.every((user) => user.longestStreak >= user.currentStreak));
  });

  /* ---------------- static analysis sanity ---------------- */
  await check('static analysis ignores code inside comments and strings', async () => {
    const challenge = await adminClient('POST', '/api/challenges', {
      title: 'Comment Trap',
      description: 'Verifies the analyzer is not fooled by comments.',
      category: 'JavaScript',
      difficulty: 'Easy',
      instructions: ['Write clean code.'],
      testCases: [
        { id: 'trap-vars', name: 'No var keyword', group: 'codeQuality', type: 'code-quality', check: 'no-var', weight: 4 },
        { id: 'trap-listeners', name: 'Uses addEventListener', group: 'functionality', type: 'js-pattern', pattern: 'addEventListener', operator: 'regex', weight: 3 },
      ],
    });
    const trap = challenge.body.data;
    const deceptive = await c('POST', '/api/submissions', {
      challengeId: trap.id,
      htmlCode: '<button id="b">go</button>',
      cssCode: '',
      jsCode: `// var should not count here\nconst message = "var var var";\ndocument.querySelector('#b').addEventListener('click', () => {});\n/* addEventListener in a comment */`,
    });
    const results = deceptive.body.data.breakdown.testResults;
    assert.ok(results.find((test) => test.testId === 'trap-vars').passed, 'var inside a comment/string must not fail the check');
    assert.ok(results.find((test) => test.testId === 'trap-listeners').passed);
    const trapRemoved = await adminClient('DELETE', `/api/challenges/${trap.id}?force=true`);
    assert.equal(trapRemoved.status, 200);
  });

  /* ---------------- summary ---------------- */
  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFailures:');
    for (const failure of failed) console.log(` - ${failure.name}: ${failure.error?.message}`);
  }

  server.close();
  const { disconnectDatabase } = await import('../config/db.js');
  await disconnectDatabase();
  await memoryMongo.close();

  process.exit(failed.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error('Verification harness crashed:', error);
  server?.close();
  process.exit(1);
});
