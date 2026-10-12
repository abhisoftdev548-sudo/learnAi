# LearnAI platform — backend reference

Team-based HTML, CSS and JavaScript practice, with an Express/MongoDB API and a React frontend. This file documents the backend. **See [FRONTEND.md](FRONTEND.md) for the complete frontend structure, API mapping, setup, browser tests and limitations.**

Frontend: `npm run dev:client` · Backend: `npm run dev:server` · Production frontend: `npm run build`

## Verification status

Verified in this workspace:
- `npm test`: **62 passing** fast tests (56 backend and 6 frontend utility tests), including HTTP security and submission orchestration. Database calls in HTTP/orchestration tests are mocked.
- `npm run check`: all backend JavaScript passes syntax checks.
- `npm audit`: **0 known vulnerabilities** at implementation time.

**Not yet verified against a live database here:** the 13-test MongoDB integration suite was attempted, but its MongoDB binary download from `fastdl.mongodb.org` failed (`ECONNRESET`) in this restricted network. No MongoDB server or database URI was supplied. Do not treat the unit-test results as database integration verification. The integration suite and CI job are included; run them against a disposable replica set before deployment. No real database connection or seed operation has been claimed or performed here.

## 1. Run locally

Requirements: Node.js **22+**, npm, and MongoDB **7+** running as a replica set (or an Atlas cluster). A standalone MongoDB server is deliberately rejected: submissions require multi-document transactions.

```bash
npm ci
cp .env.example .env
# Edit .env with your database URI, random JWT secret and frontend origin.
# Generate a secret locally (do not commit it):
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"

# Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.
npm run seed
npm run dev
# Or: npm start
```

The API binds to `0.0.0.0:5000` by default. Startup fails rather than serving a partially connected API. `.env` is ignored by Git and excluded from Docker builds.

### Optional local MongoDB using Docker

Run these on a machine with Docker and access to Docker Hub:

```bash
docker run -d --name learnai-mongo -p 127.0.0.1:27017:27017 \
  -v learnai-mongo-data:/data/db mongo:7 --replSet rs0 --bind_ip_all
# Once mongod is ready:
docker exec learnai-mongo mongosh --quiet --eval \
  'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
```

Use `mongodb://127.0.0.1:27017/learnai?replicaSet=rs0` when running Node on the same host. This unauthenticated, loopback-bound MongoDB setup is for local development only. Use authenticated, TLS-enabled MongoDB with restricted network access in production.

### Tests

```bash
npm test                         # fast tests; DB suite is opt-in
npm run check
npm audit
npm run test:integration          # downloads MongoDB and starts temporary replica set

# Alternatively supply an existing disposable replica-set database:
TEST_MONGODB_URI='mongodb://127.0.0.1:27017/learnai_test?replicaSet=rs0' npm run test:integration

# Or use a locally installed mongod without downloading:
MONGOMS_SYSTEM_BINARY=/path/to/mongod npm run test:integration
```

**The integration suite erases its database before and after running.** Supplied database names must end in `_test`. Never supply a production URI. The suite covers registration and password hashing, cookies, login/logout revocation, authorization, challenge CRUD/filtering, submission persistence, first-solve XP, achievements, profile/history privacy, all leaderboard periods, concurrency/attempt limits, archival and team/admin statistics. Unit tests cover scoring, UTC streak boundaries, validation, and non-execution of submitted JS.

`.github/workflows/backend.yml` runs syntax, dependency audit, fast tests and the real MongoDB integration suite on pushes/PRs. Its result has not been run or observed in this workspace.

## 2. Complete backend structure

```text
server/
├── config/
│   ├── db.js                  # connection and replica-set check
│   ├── env.js                 # validated environment configuration
│   └── indexes.js             # production index creation command
├── controllers/
│   ├── adminController.js
│   ├── authController.js
│   ├── challengeController.js
│   ├── submissionController.js
│   └── userController.js
├── middleware/
│   ├── auth.js                # JWT, roles, Origin/CSRF checks
│   └── error.js               # consistent sanitized errors
├── models/
│   ├── Achievement.js
│   ├── Challenge.js
│   ├── Submission.js
│   ├── Team.js
│   ├── User.js
│   ├── UserAchievement.js
│   └── index.js
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── challengeRoutes.js
│   ├── index.js
│   ├── submissionRoutes.js
│   └── userRoutes.js
├── services/
│   ├── achievementService.js
│   ├── adminService.js
│   ├── authService.js
│   ├── challengeService.js
│   ├── evaluationService.js
│   ├── leaderboardService.js
│   ├── profileService.js
│   ├── progressionService.js
│   └── submissionService.js
├── utils/
│   ├── http.js
│   └── validation.js
├── seed/
│   ├── data.js
│   └── index.js
├── tests/
│   ├── evaluation.test.js
│   ├── http.test.js
│   ├── integration.test.js
│   ├── progression.test.js
│   ├── setup.js
│   └── submission.test.js
├── app.js                     # Express app (no listening side effects)
└── server.js                  # DB startup, listener, graceful shutdown

.env.example
.github/workflows/backend.yml
.dockerignore
.gitignore
Dockerfile
package.json
package-lock.json
vitest.config.js
README.md
```

## 3. Environment variables

| Variable | Required / default | Meaning |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test`, `production` |
| `PORT` | `5000` | HTTP listener port |
| `MONGODB_URI` | **Required** | MongoDB replica-set/Atlas connection string |
| `JWT_SECRET` | **Required**, 32+ characters | Strong random signing secret; keep private |
| `JWT_EXPIRES_IN` | `7d` | Positive integer plus `m`, `h` or `d`; cookie lifetime matches JWT |
| `CORS_ORIGINS` | **Required** | Comma-separated exact frontend origins; no wildcard or trailing slash |
| `COOKIE_SAME_SITE` | `lax` | `lax`, `strict`, or `none` |
| `COOKIE_SECURE` | `false` in development | Secure cookie override; **always enabled in production** |
| `TRUST_PROXY` | `0` | Trusted proxy hop count; set only for your known topology |
| `SEED_ADMIN_EMAIL` | Required for seed only | Bootstrap admin email |
| `SEED_ADMIN_PASSWORD` | Required for seed only | 10+ characters, at most 72 UTF-8 bytes |
| `TEST_MONGODB_URI` | Optional, tests only | Disposable database ending in `_test`; erased by integration tests |

SameSite `none` requires Secure cookies. Production origins must be HTTPS. No cookie domain is set (host-only cookie). Registration defaults to `user`; submitted `role`, `xp`, or other privileged fields are rejected. The seed creates the initial admin and refuses to promote an existing regular account. Re-running seed preserves existing challenges, achievement definitions and admin password; remove bootstrap credentials from the runtime environment after setup.

## 4. REST API endpoints

All `/api` endpoints use JSON. All except registration/login require a valid `session` cookie. Every POST/PUT/DELETE request requires an `Origin` header exactly matching `CORS_ORIGINS`, including requests from curl/Postman. This is the cookie-auth CSRF protection; CORS alone is not relied on.

| Method | Endpoint | Access / description |
|---|---|---|
| POST | `/api/auth/register` | Public; creates user and session |
| POST | `/api/auth/login` | Public; email/password login |
| POST | `/api/auth/logout` | User; revokes **all** existing sessions and clears cookie |
| GET | `/api/auth/me` | User; private profile of current user |
| GET | `/api/challenges` | User; paginated list, `category`, `difficulty`, literal title `search` filters |
| GET | `/api/challenges/:id/progress` | User; own persisted attempts and completion |
| GET | `/api/achievements` | User; achievement definitions from MongoDB |
| GET | `/api/challenges/:id` | User; full challenge; test definitions only visible to admins |
| POST | `/api/challenges` | Admin; create |
| PUT | `/api/challenges/:id` | Admin; replace editable definition before any submissions |
| DELETE | `/api/challenges/:id` | Admin; soft-delete/archive |
| POST | `/api/submissions` | User; deterministic evaluation and transactional persistence |
| GET | `/api/submissions/me` | User; paginated own history |
| GET | `/api/submissions/:id` | Owner only; includes submitted source and test results |
| GET | `/api/users/me` | User; own profile including email/statistics/achievements |
| PUT | `/api/users/me` | User; update only `name`, `bio`, `avatar` |
| GET | `/api/users/:username` | User; another user's public profile, no email |
| GET | `/api/leaderboard` | User; `period=weekly\|monthly\|all-time`, includes current user's rank |
| GET | `/api/teams/me` | User; own team or `null` |
| GET | `/api/admin/dashboard` | Admin; platform statistics |
| GET | `/api/admin/users` | Admin; paginated users |
| GET | `/api/admin/submissions` | Admin; paginated submission monitoring (no source code) |
| GET | `/api/admin/teams` | Admin; paginated teams with aggregate member statistics |
| POST | `/api/admin/teams` | Admin; create team (`name`, `slug`, optional `description`) |
| PUT | `/api/admin/users/:id/team` | Admin; assign user to team or remove with `teamId: null` |
| GET/POST | `/api/admin/challenges` | Admin-only aliases of challenge list/create |
| GET/PUT/DELETE | `/api/admin/challenges/:id` | Admin-only aliases of challenge detail/update/archive |
| GET | `/health/live` | Public; process liveness |
| GET | `/health/ready` | Public; 200 when DB connected, otherwise 503 |

Lists accept `page` (default 1, max 10000) and `limit` (default 20, max 100), returning `{items,total,page,limit}`. Invalid filters, malformed ObjectIds and unknown mutation fields return 400. Own history includes challenge, score, `attemptNumber`, tests passed, time taken, submitted date and status; it omits large source fields. Submission detail is owner-only even for admins.

Responses:

```json
{"success":true,"message":"Success","data":{}}
```

```json
{"success":false,"message":"Unauthorized"}
```

HTTP codes: `200` success, `201` created, `400` validation, `401` missing/expired/revoked session or invalid login, `403` role/origin denied, `404` missing/not-owned/archived resource, `409` duplicate/attempt limit/immutable challenge, `413` oversized request, `429` rate limit, `500` sanitized server error, `503` DB readiness failure. `X-Request-Id` is included. Non-production errors also include `requestId` in the body.

## 5. MongoDB models and invariants

| Model | Fields and behavior |
|---|---|
| **User** | `name`, unique lowercase `username`, unique lowercase `email`, bcrypt `password` (12 rounds), `avatar`, `bio`, `role`, `xp`, `level`, `totalScore`, `challengesSolved`, `currentStreak`, `longestStreak`, timestamps. Also `submissionCount`, `bestScore`, `categorySolved`, `lastPracticeDate`, `teamId`, private `tokenVersion` and private transaction `submissionLock`. Password excluded from queries and all auth responses; email only exposed in own profile/auth responses. |
| **Challenge** | `title`, `description`, category (`HTML`, `CSS`, `JavaScript`), difficulty (`Easy`, `Medium`, `Hard`), `instructions[]`, `starterHTML`, `starterCSS`, `starterJS`, private `testCases[]`, `maxAttempts`, `timeLimit`, `xp`, `hints[]`, `createdBy`, timestamps. Also seed `slug`, `submissionCount`, `solvedCount`, `totalScore`, `deletedAt`. |
| **Submission** | `userId`, `challengeId`, `htmlCode`, `cssCode`, `jsCode`, `score`, `testsPassed`, `totalTests`, `attemptNumber`, `timeTaken`, status (`passed`, `partial`, `failed`), `submittedAt`. Also immutable category snapshot, `xpEarned`, `firstSolve`, `testResults`, `evaluationMode`. Unique `(userId,challengeId,attemptNumber)` index. |
| **Achievement** | Unique `key`, `name`, `description`, supported `metric`, `threshold`, timestamps. |
| **UserAchievement** | `userId`, `achievementId`, `earnedAt`; unique `(userId,achievementId)` prevents repeat awards. |
| **Team** | `name`, unique `slug`, `description`, `createdBy`, timestamps. Each user belongs to zero or one team; membership is admin-managed. |

Challenge updates are full-definition PUTs. Once submissions exist, definitions become immutable; publish a new challenge for changed requirements. DELETE archives the challenge so old history, scores and achievements remain coherent. Profile category denominators include archived challenges. Teams report sums of **current members'** lifetime statistics; challenges-solved is a member-solve sum, not distinct team challenges. Invitations, team ownership, multi-team membership and team-specific challenge assignment are not included.

## 6. Scoring, XP, streaks and rankings

### Deterministic tests

The API accepts only allowlisted test definitions, never executable test strings or arbitrary regular expressions:

| Type | Required fields beyond `type`, `label`, `group` |
|---|---|
| `html-selector` | `selector`, optional `minCount` (defaults to 1) |
| `html-attribute` | `selector`, `attribute`, `expected` |
| `css-declaration` | `selector`, `property`, `expected`, optional exact `media` condition |
| `js-node` | allowlisted `nodeType` |
| `js-call` | `callee` (static member path or method name) |

Example:

```json
{"type":"html-selector","label":"Semantic profile","group":"structure","selector":"article.profile","minCount":1}
```

Weights are structure **20**, layout **25**, functionality **30**, responsive **15**, quality **10**. Tests split their group's weight equally. Absent groups are excluded and remaining weights normalized to 100. All tests passed = `passed`/100; none passed = `failed`/0; otherwise `partial` (score capped at 99). Parsing failures fail the affected language's checks without executing anything. Group names describe the rubric, not a guarantee of visual/functionality validation.

Every valid evaluated attempt, including failed and partial attempts, is persisted. Requests rejected for authentication, malformed input, missing challenge or exhausted attempts are not submissions. `maxAttempts` is the user's lifetime limit for that challenge.

### Rewards

- Base XP: Easy **50**, Medium **100**, Hard **200**, or admin-specified challenge XP.
- On **first full solve only**: +20 perfect-score bonus; +10 if it was attempt one; on a new practice day with streak >1, +`min(streak,7)*5`.
- Repeated solves and partial/failed attempts earn zero XP; achievements and solve counts cannot be farmed by re-submitting.
- Level = `floor(sqrt(xp / 100)) + 1`.
- `challengesSolved` counts distinct fully passed challenges. `totalScore` and `averageScore` include **every** submission, not just best attempts. `bestScore` is best single attempt.
- Any passed submission counts as successful daily practice (even a repeat solve, within attempt limits). UTC calendar days are used. Same day never increments twice; consecutive day increments; a missed day resets the next success to one. Profiles expose zero for expired streaks even before the next submission. Longest streak is preserved.
- Seeded achievements: First Challenge, 10 Challenges, 50 Challenges, Perfect Score, 7 Day Streak, 30 Day Streak, CSS Master (4 CSS solves), JavaScript Beginner (1 JavaScript solve).

All submission changes—attempt, score history, user statistics, XP, streak, challenge counters and achievements—commit in **one MongoDB transaction**. A per-user write serializes concurrent submissions; driver transaction retries and unique indexes protect limits/awards.

Leaderboards order by XP descending, solved descending, average score descending, then user ID ascending for deterministic ties. They return ordinal ranks and a separate `me` record independent of pagination. Weeks begin Monday 00:00 UTC; months begin on the first at 00:00 UTC. Period XP comes from submissions within the period; period solves count first solves in that period, and average score uses attempts in that period. All registered users (including admins/inactive users with zero period activity) can appear.

Admin `activeUsers` means distinct users with any submission in the last 30 days. Most popular category is by lifetime submission volume.

## 7. Example requests and responses

### Register and retain the HTTP-only cookie

```bash
curl -i -c cookies.txt http://localhost:5000/api/auth/register \
  -H 'Origin: http://localhost:5173' -H 'Content-Type: application/json' \
  -d '{"name":"Alice","username":"alice","email":"alice@example.com","password":"a-long-unique-password"}'
```

Returns 201, `Set-Cookie: session=...; HttpOnly; SameSite=Lax` (also `Secure` in production), and the new user's safe fields. JWT is **not** returned in JSON.

### Login, profile and filtered challenges

```bash
curl -c cookies.txt http://localhost:5000/api/auth/login \
  -H 'Origin: http://localhost:5173' -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"a-long-unique-password"}'
curl -b cookies.txt http://localhost:5000/api/users/me
curl -b cookies.txt 'http://localhost:5000/api/challenges?category=HTML&difficulty=Easy&page=1&limit=20'
```

### Admin creates a challenge

After logging in as the seeded admin into `admin-cookies.txt`:

```bash
curl -b admin-cookies.txt http://localhost:5000/api/challenges \
  -H 'Origin: http://localhost:5173' -H 'Content-Type: application/json' \
  -d '{
    "title":"Semantic Heading",
    "description":"Add a main heading to the page.",
    "category":"HTML",
    "difficulty":"Easy",
    "instructions":["Add an h1 inside main."],
    "starterHTML":"<main></main>",
    "testCases":[{"type":"html-selector","label":"Main heading","group":"structure","selector":"main h1"}],
    "maxAttempts":10,
    "timeLimit":600,
    "hints":["Use an h1 element."]
  }'
```

### Submit a solution

Replace `CHALLENGE_ID` with a real ID from the list response:

```bash
curl -b cookies.txt http://localhost:5000/api/submissions \
  -H 'Origin: http://localhost:5173' -H 'Content-Type: application/json' \
  -d '{"challengeId":"CHALLENGE_ID","htmlCode":"<main><h1>Hello</h1></main>","cssCode":"","jsCode":"","timeTaken":35}'
```

Illustrative 201 response (IDs and timestamps abbreviated):

```json
{
  "success": true,
  "message": "Challenge submitted successfully",
  "data": {
    "submission": {
      "_id": "...",
      "challengeId": "...",
      "userId": "...",
      "htmlCode": "<main><h1>Hello</h1></main>",
      "cssCode": "",
      "jsCode": "",
      "category": "HTML",
      "score": 100,
      "testsPassed": 1,
      "totalTests": 1,
      "attemptNumber": 1,
      "timeTaken": 35,
      "status": "passed",
      "xpEarned": 80,
      "firstSolve": true,
      "testResults": [{"label":"Main heading","passed":true}],
      "evaluationMode": "static-v1",
      "submittedAt": "..."
    },
    "achievements": [{"key":"first-challenge","name":"First Challenge"},{"key":"perfect-score","name":"Perfect Score"}],
    "level": 1,
    "currentStreak": 1
  }
}
```

Achievement objects also contain their definition fields and IDs. Attempt counts are generated server-side. Client-supplied score, XP, user ID or test results are rejected.

```bash
curl -b cookies.txt 'http://localhost:5000/api/submissions/me?page=1'
curl -b cookies.txt 'http://localhost:5000/api/leaderboard?period=weekly'
curl -b cookies.txt -X PUT http://localhost:5000/api/users/me \
  -H 'Origin: http://localhost:5173' -H 'Content-Type: application/json' \
  -d '{"bio":"Practicing accessible HTML"}'
curl -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/auth/logout \
  -H 'Origin: http://localhost:5173'
```

### React integration contract

Requests must include credentials (`fetch(..., {credentials: 'include'})` or Axios `withCredentials: true`). The browser supplies the Origin header. Do not store/read the JWT in JavaScript. Prefer a same-site reverse proxy for the React app and `/api`. For genuinely cross-site deployments, use HTTPS plus `COOKIE_SAME_SITE=none` and configure the exact frontend origin; browser third-party-cookie restrictions may still block cookies. Never point a deployed browser at the server's `localhost`.

## 8. Execution and scoring limitations — important

1. **User JavaScript is never executed in Node**, including via `eval`, `Function`, `vm`, imports or a shell. Cheerio parses HTML, PostCSS parses CSS, Acorn parses JS syntax. No browser or user-controlled network fetch is started by this backend.
2. This is **static-v1 validation, not a secure behavioral judge**. DOM selectors check markup structure; CSS tests check declared rules and normalized values, not computed layout, specificity, visibility, screenshots or actual responsiveness. JS AST tests detect syntactic constructs/calls, not correct outputs or event behavior. Dead code, unreachable calls and misleading declarations can pass. These scores must not be represented as proof that arbitrary JS works, used for high-stakes grading, or attached to monetary rewards.
3. No client-reported pass/fail, score or XP is trusted. The React frontend runs a **non-authoritative preview** in a separate-origin iframe with `sandbox="allow-scripts"` (no `allow-same-origin`), restrictive CSP/network policy, validated `postMessage` boundaries and reset/time limits. Do not render submissions into the trusted app DOM. See `src/components/Preview.jsx` and `FRONTEND.md` for the implemented preview and its isolation limitations.
4. The replaceable `evaluateSubmission(challenge, code)` adapter is the boundary for a future isolated execution service. Such a runner needs per-job containers/microVMs, CPU/memory/wall-clock/output limits, disabled network/host access, ephemeral filesystems, an authenticated internal API and server-owned behavioral tests. An ordinary Node `vm` is **not** a sufficient security boundary.
5. `timeTaken` is client-reported metadata and `timeLimit` is advisory; neither affects authoritative scoring. Timed competitions need server-issued start sessions and server-enforced deadlines.
6. Each source field is limited to 50,000 characters, bodies to 200 KB, and challenges to 50 tests. Parsing is bounded by input limits but is synchronous; at large scale move evaluation into a bounded worker pool/separate service and profile adversarial parser inputs.

## 9. Deployment and scaling checklist

- Provision an authenticated TLS replica set/Atlas database; use least-privilege credentials, backups and monitoring. Never expose MongoDB to the public internet.
- Run `npm run db:indexes` before production traffic. `npm run seed` also creates indexes and is non-destructive/idempotent. Production `autoIndex` is off; unique constraints depend on installing indexes.
- Run the MongoDB integration suite successfully in an environment with database access **before calling the deployment verified**.
- Deploy behind TLS, set exact HTTPS origins and a random JWT secret; keep secrets in the environment/secret manager, not an image. Configure `TRUST_PROXY` only for known proxy paths to avoid spoofed IP-based limits.
- Authentication is capped at 20 requests/15 minutes/IP, API traffic at 120/minute/IP and submissions at 20/minute/user. Built-in rate-limit stores are **per-process memory**. For multiple replicas use a shared gateway/distributed limiter; in-memory limits alone do not provide cluster-wide enforcement.
- User submission updates are serialized transactionally. Every submission also updates its challenge document; popular challenges can become write hot spots. High throughput may require partitioned/materialized counters with a carefully preserved reward ledger.
- Leaderboards are computed from indexed MongoDB data with a 10-second aggregation limit and paginated results. At large scale, materialize/cache period rankings instead of aggregating them for every request. Team stats are based on current membership, not historical membership snapshots.
- Keep production logs free of passwords, cookies, tokens, code and connection strings. Error logs here contain only request ID, error type and status. Add safe access/metrics/audit logging at your infrastructure layer.
- All responses are `no-store`; security headers use Helmet. Application shutdown drains HTTP connections and closes MongoDB, with a 10-second shutdown deadline.
- The Dockerfile builds a non-root Node runtime with production dependencies only. Supply `.env`/secrets at runtime, not at build time. MongoDB is external to this image.
