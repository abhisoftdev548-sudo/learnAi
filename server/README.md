# LearnAI API (backend)

Node.js · Express · MongoDB · Mongoose · JWT (HTTP-only cookies) · bcryptjs · ES modules.

The API powers the team coding-practice platform: challenges, submissions with
deterministic scoring, XP & levels, streaks, achievements, leaderboards, profiles
and the admin dashboards.

```text
server/
├── config/         env loading, mongo connection, domain constants
├── controllers/    thin HTTP layer (validation + response envelope)
├── middleware/     auth (JWT cookie), role guards, rate limits, error handling
├── models/         User, Challenge, Submission, Achievement (Mongoose)
├── routes/         /api routers
├── services/       business logic (scoring, submissions, xp, streaks, …)
│   ├── analysis/   deterministic HTML/CSS/JS analyzers (no code execution)
│   └── execution/  measurement providers (sandboxed client iframe, remote runner)
├── seed/           achievement catalogue, accounts, 12 challenges, demo activity
├── utils/          ApiError, async handler, jwt, cookies, validation, logging
├── scripts/        dev in-memory MongoDB + end-to-end verification suite
├── app.js          express app factory
└── server.js       bootstrap + graceful shutdown
```

## Quick start

```bash
cp .env.example .env          # set JWT_SECRET and MONGO_URI
npm install
npm run seed                  # achievements + admin + 12 challenges + demo team
npm run dev                   # http://localhost:5000
```

Seeded accounts (override with the `SEED_*` env vars):

| Role  | Username | Password       |
| ----- | -------- | -------------- |
| admin | `admin`  | `Admin@12345`  |
| user  | `maya`, `daniel`, `priya`, `lukas`, `sofia`, `tom` | `Practice@123` |

### No local MongoDB?

`npm run dev:memory` boots the API against a wire-protocol compatible in-memory
MongoDB (`scripts/dev-mongo/`) and seeds it automatically. It is a development
convenience for sandboxes and CI only — production always uses a real MongoDB via
`MONGO_URI`.

```bash
npm run dev:memory            # API + in-memory DB + seed if empty
npm run dev:memory -- --fresh # wipe and re-seed
```

## Verification

```bash
npm test              # 37 end-to-end checks against a real HTTP server
npm test -- --verbose # also prints the in-memory DB traffic
```

The suite boots the API on a random port, seeds the database and exercises:
registration, login, logout, session/protected routes, role guards, challenge
filters and CRUD, the full submission pipeline (scoring, attempts limit, XP,
level-ups, streaks, achievements), submission history, profile updates, the
leaderboards for all three periods, the achievement catalogue and every admin
endpoint — including a perfect run that must score exactly 100/100.

## API surface

All responses use the envelope `{ success, data, meta? }` /
`{ success: false, error: { message, code, details? } }`.

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/api/health` | – | service + database + execution provider status |
| POST | `/api/auth/register` | – | create account (sets HTTP-only cookie) |
| POST | `/api/auth/login` | – | sign in with username *or* email |
| POST | `/api/auth/logout` | – | clear the auth cookie |
| GET | `/api/auth/me` | user | session user + headline stats |
| GET | `/api/auth/session` | – | cookie probe for the SPA bootstrap |
| PATCH | `/api/auth/password` | user | change password (current password required) |
| GET | `/api/challenges` | – | list + `category`, `difficulty`, `status`, `search`, `sort` filters, facets, per-user progress |
| GET | `/api/challenges/:id` | – | workspace payload by id **or** slug (starter code, hints, attempts, sandbox ticket) |
| POST/PUT/DELETE | `/api/challenges[/:id]` | **admin** | authoring |
| POST | `/api/submissions` | user | score a submission (see flow below) |
| GET | `/api/submissions/me` | user | own history (filters + pagination) |
| GET | `/api/submissions/:id` | owner/admin | full submission incl. code + test breakdown |
| GET | `/api/users/me` | user | private profile + stats + recommendation |
| PUT | `/api/users/me` | user | name, bio, avatar, editor preferences |
| GET | `/api/users/me/{stats,progress,activity,achievements,submissions,history}` | user | dashboards |
| GET | `/api/users/:username` | – | public profile (never exposes other users' code) |
| GET | `/api/leaderboard?period=weekly\|monthly\|all-time` | – | ranked entries + the caller's position |
| GET | `/api/leaderboard/preview` | – | public top-5 for the landing page |
| GET | `/api/achievements` | – | catalogue with per-user progress |
| GET | `/api/admin/{stats,statistics,users,submissions,system}` | **admin** | dashboards |
| PATCH | `/api/admin/users/:id` | **admin** | role/profile moderation |

### Submission flow

1. authenticate (cookie) → 2. load challenge → 3. enforce `maxAttempts`
→ 4. validate code size/shape → 5. **run tests safely** → 6. compute score
→ 7. save submission → 8. award XP/levels → 9. advance the streak
→ 10. evaluate achievements → 11. return the full result.

## How untrusted code is handled

**User JavaScript is never executed inside this Node.js process.**

- `services/analysis/*` are tokenizers: HTML → DOM tree, CSS → rules/declarations,
  JS → comment/string-safe token scan (balance, identifiers, listeners, quality).
  They are pure functions and cannot execute user code.
- Declarative, server-verified tests (`kind: 'static'`) cover structure, CSS,
  responsiveness techniques, patterns and code quality.
- Behavioural tests (`kind: 'measure'`) need a live DOM. The sandboxed iframe in
  the browser only **measures** (`services/execution/clientSandbox.provider.js`):
  it returns raw values which the server judges against the test's `checks`.
  A short-lived sandbox ticket (JWT, bound to user + challenge) authorizes the
  measurement payload, which is size- and shape-limited.
- `EXECUTION_PROVIDER=remote-runner` swaps in a dedicated isolated service
  (containers/microVMs) over a documented HTTP contract — see
  `services/execution/remoteRunner.provider.js`. Scoring rules stay unchanged.

## Scoring

| Group | Points |
| ----- | ------ |
| HTML structure | 20 |
| CSS / layout | 25 |
| Functionality | 30 |
| Responsiveness | 15 |
| Code quality | 10 |
| **Total** | **100** |

Points are distributed across the group's tests by weight and rounded to whole
points, so a fully correct submission always scores exactly 100. Challenges that
do not exercise all five groups are re-normalised proportionally (largest
remainder), which is why the API returns the effective `max` per group.

## XP, levels, streaks, achievements

- Base XP by difficulty: Easy 50 · Medium 100 · Hard 200.
- Base XP scales with **improvement over your best score** on that challenge, so
  repeated attempts cannot farm XP. Bonuses (new best only): perfect score
  `+50%`, first-attempt pass `+25%`, streak `+5 XP/day` (max 7 days).
- Levels: reaching level *L* needs `50 · L · (L − 1)` XP.
- Streaks are tracked on UTC calendar days (same day = no change, next day = +1,
  gap ≥ 2 days = reset to 1); `longestStreak` is preserved.
- Achievements are data driven (`Achievement.criteria`) and evaluated after every
  submission, awarding their XP reward once.

## Security

Password hashing (bcryptjs, 12 rounds) · JWT in an HTTP-only, SameSite cookie ·
role based authorization · validated and bounded input everywhere · rate limiting
on auth/submission endpoints · helmet · strict CORS allow-list (with the
same-host rule the preview proxy needs) · centralised error handling that never
leaks internals in production · secrets only through environment variables
(`.env` is git-ignored, `.env.example` documents every key).
