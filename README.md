# TeamForge

A full-stack **team learning & practice platform**: admin-managed challenges, submissions with review & scoring, events, polls, community feed, leaderboards and in-app notifications — with a real database, role-based access control and JWT HttpOnly-cookie auth.

- **Frontend** — React 18 + Vite + Tailwind CSS + React Router + Lucide icons + Axios + React Hot Toast (`client/`)
- **Backend** — Node.js + Express + Mongoose + MongoDB, bcryptjs password hashing, JWT in HttpOnly cookies, Multer file uploads (`server/`)
- **Database** — any MongoDB via `MONGODB_URI`, **or zero-setup embedded MongoDB** (no install needed — a real mongod-compatible engine runs in-process; see [Database setup](#database-setup))

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Install](#install)
3. [Database setup](#database-setup)
4. [Initial admin account](#initial-admin-account)
5. [Running the app](#running-the-app)
6. [Environment variables](#environment-variables)
7. [Project structure](#project-structure)
8. [Screens](#screens)
9. [API documentation](#api-documentation)
10. [Testing](#testing) (automated + manual checklist)
11. [Security notes](#security-notes)
12. [Deployment](#deployment)
13. [How points & the leaderboard work](#how-points--the-leaderboard-work)

---

## Prerequisites

- **Node.js ≥ 20** (tested on v22) and npm
- A C compiler (`gcc`/`g++`) **only if** your Linux glibc is older than 2.38 and you use the embedded engine (the launcher builds a tiny compatibility shim automatically)
- No MongoDB installation required for development

## Install

```bash
git clone <repo-url> && cd learnai

# backend
cd server && npm install

# frontend
cd ../client && npm install
```

## Database setup

**Option A — embedded engine (default, zero config).**
Just start the server. It opens a real MongoDB-compatible engine in-process and stores data in `server/.data/mongo/`. The URI is published to `server/.data/mongo.uri` so sibling processes (the test suite) can reuse the same engine instead of opening a second one.

**Option B — external MongoDB.**

```bash
# server/.env
MONGODB_URI=mongodb://localhost:27017/teamforge
```

> `server/.env` is git-ignored — never commit secrets. Copy `server/.env.example` as a starting point.

**Linux/glibc note:** engine binaries are built against glibc ≥ 2.38. On older systems `scripts/with-engine.js` (used by every npm script) automatically relabels the binaries' version needs and LD_PRELOADs a small shim (`scripts/embedded/glibc238shim.so`, built from bundled C source with `gcc` when no prebuilt copy is present). On modern glibc all of this is a no-op.

## Initial admin account

```bash
cd server
ADMIN_EMAIL=admin@teamforge.dev \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD='YourStrongPassword!' \
ADMIN_NAME='Team Admin' \
npm run seed:admin
```

- Idempotent — running it again updates the existing admin instead of duplicating.
- Without env vars it falls back to `admin@teamforge.dev` / `Admin123!` (development only — change it).

New member registrations start as **`pending`** and can only log in after an admin approves them.

## Running the app

**Development (two terminals):**

```bash
# terminal 1 — API on http://localhost:5000
cd server && npm run dev

# terminal 2 — Vite dev server on http://localhost:5173 (proxies /api)
cd client && npm run dev
```

**Production (single port):**

```bash
cd client && npm run build     # emits client/dist
cd ../server && NODE_ENV=production npm start
```

Express serves the built SPA (`client/dist`) with history fallback and `/api/*` on `http://localhost:5000`. All images are stored on Cloudinary.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | API / production server port |
| `MONGODB_URI` | *(unset → embedded engine)* | External MongoDB connection string |
| `JWT_SECRET` | dev default (**required ≥ 32 chars in production**) | Signs auth cookies |
| `JWT_EXPIRES_IN` | `7d` | Session lifetime |
| `COOKIE_MAX_AGE_MS` | 7 days | Auth cookie lifetime |
| `CLIENT_URL` / `CORS_ORIGINS` | *(empty)* | Comma-separated allowed origins (credentials CORS) |
| `MAX_UPLOAD_MB` | `2` | Photo/avatar upload cap |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | *(required)* | Cloudinary credentials for image uploads |
| `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME` | see above | Initial admin seeding |

## Project structure

```
client/                 React SPA
  src/components/       Reusable UI (Modal, ConfirmDialog, Form, StatusBadge, …)
  src/layouts/          Dashboard sidebar shell, admin shell
  src/pages/            23 member screens
  src/pages/admin/      Admin panel screens (overview, approvals, review queue, …)
  src/services/api.js   Axios instance (credentials, error helpers)
  src/context/          AuthContext (session state machine)
server/
  src/config/           env, db (embedded/external)
  src/models/           User, Challenge, Submission, SubmissionReview, Event,
                        EventRegistration, Poll, Vote, Post, Comment, Like,
                        Notification, Report (+ indexes/unique constraints)
  src/controllers/      Route handlers
  src/middleware/       requireAuth → requireApproved → requireAdmin, upload, errors
  src/routes/           /api/{auth,users,admin,challenges,submissions,events,
                        polls,community,notifications,leaderboard}
  src/services/         Leaderboard computation
  scripts/              Engine launcher, glibc patcher, shim source, seed
  tests/                Automated critical-flow tests (Jest + Supertest)
```

## Screens

**Member (23):** Landing · Login · Register · Pending approval · Dashboard · Challenges · Challenge detail (+ submission) · Events · Event detail · Polls · Poll detail · Community feed · Post detail · Leaderboard · Members directory · Member profile · My profile · Notifications · Settings · 404 — plus admin-panel entry in the sidebar for admins.

**Admin:** Overview (stats) · Member approvals · Member management · Challenges (CRUD: draft/published/archived, requirements, late submissions) · Participation report (per-challenge, computed from the DB) · Submission review queue + scoring · Events (CRUD, registrations, attendance) · Polls (CRUD, close/archive) · Community moderation (reports).

---

## API documentation

Base URL: `/api`. Success responses: `{ "success": true, "data": … }`.
Errors: `{ "success": false, "message": "…", "code": "ERROR_CODE", "errors": [...] }`.
Auth: HttpOnly cookie `tf_token` (SameSite=Lax). Mutating requests must come from an allowed Origin.

### Auth — `/api/auth`
| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/register` | public | Create account → status `pending` (optional multipart `photo`, ≤ 2 MB image). Rate limit 5/h |
| POST | `/login` | public | `{identifier, password}` → sets cookie. `403 PENDING_APPROVAL` / `ACCOUNT_REJECTED` before admin decision. Rate limit 10/15 min |
| GET | `/me` | session | Current user (never includes password hash) |
| POST | `/logout` | session | Clears cookie |

### Users — `/api/users`
| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/` | approved | Directory: `q`, `skill`, `page` |
| GET | `/dashboard` | approved | Overview cards, deadlines, recent activity |
| GET | `/me` · PATCH `/me` | session | Own profile (role/status/points **cannot** be self-assigned) |
| PATCH | `/me/password` | session | `{currentPassword, newPassword}` |
| POST | `/me/photo` | session | Avatar upload (2 MB images) |
| GET | `/:username` | approved | Public profile — no email/password/token fields |

### Challenges — `/api/challenges`
| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/` | approved | Filters `q`, `category`, `difficulty`, `status`, `page`; includes `memberStatus`/time state |
| POST | `/` · PATCH `/:id` | admin | CRUD incl. `requirements[]` (configurable required submission types), `allowLateSubmissions`, `allowResubmission`, `communityVisibility`, publish/archive |
| DELETE | `/:id` | creator/admin | Delete the challenge for everyone (blocked when submissions exist) |
| GET | `/:id` | approved | Detail + my submission state |
| GET | `/:id/participation` | admin | Per-challenge member-by-member report (computed from DB) |

### Submissions — `/api/submissions`
| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/challenges/:challengeId` | approved | Submit answers for every required field; validates types/URL hosts, deadline, duplicates (`DUPLICATE_SUBMISSION`), resubmission policy |
| GET | `/challenges/:challengeId/mine` · `GET /:id` | owner/admin | My submission + history |
| POST | `/upload` | approved | Upload an image answer (≤ 2 MB) → Cloudinary URL |
| POST | `/:id/review` | admin | `{points (0..max), status: approved\|needs_changes\|rejected, feedback}` — recomputes member score exactly once per latest review |
| GET | `/` | admin | Review queue: `status`, `challenge`, `q` filters |

### Events — `/api/events`
| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/` · GET `/:id` | approved | `meetingUrl` only visible to registered/attending members |
| POST · PATCH | `/:id` | admin | Create/update events, statuses draft/published/completed/cancelled, registration deadline |
| DELETE | `/:id` | creator/admin | Delete the event for everyone |
| POST | `/:id/register` / `/unregister` | approved | `ALREADY_REGISTERED`, `REGISTRATION_CLOSED`, `EVENT_PAST` |
| POST | `/:id/attendance` | admin | Mark attendance per member |

### Polls — `/api/polls`
| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/` · GET `/:id` | approved | Live status (draft/active/closed/expired/archived), results per visibility rules |
| POST · PATCH · DELETE | `/:id` | admin | Configurable: anonymous, multi-choice, changeable votes, visibility, results visibility |
| POST | `/:id/vote` | approved | One vote per member unless `allowMultiple`; `ALREADY_VOTED`, `SINGLE_CHOICE_ONLY`, `POLL_CLOSED` |
| POST | `/:id/status` | admin | open/close/archive |

### Community — `/api/community`
| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/` | approved | Paginated feed; approved submissions appear per challenge `communityVisibility` |
| POST | `/` · DELETE `/:id` | approved | Create a post; author or admin can delete it for everyone |
| POST | `/posts/:id/comments` · DELETE `/comments/:id` | approved | Comments (paginated on post detail) |
| POST | `/posts/:id/like` | approved | Toggle like |
| POST | `/posts/:id/report` · GET `/reports` · PATCH `/reports/:id` | approved / admin | Moderation (resolve/dismiss/remove content) |

### Group chat — `/api/chat`
| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/messages` | approved | List recent group messages |
| POST | `/messages` | approved | Send a group message |
| DELETE | `/messages/:id` | author/admin | Delete the message for everyone |

### Notifications — `/api/notifications`
| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/` | session | Paginated; `unread` filter |
| GET | `/unread-count` | session | Badge count |
| PATCH | `/:id/read` · PATCH `/read-all` | session | Mark read |

### Leaderboard — `/api/leaderboard`
| GET | `/` | approved | `scope=all\|month\|week` — rank by **points → completed challenges → latest score timestamp**; includes `me`.

### Admin — `/api/admin` (admins only)
| GET | `/stats` | Overview counters |
| GET | `/users` · PATCH `/users/:id/status` · PATCH `/users/:id/role` | Search/filter, approve/reject (with reason), suspend/reactivate, promote/demote |
| GET | `/pending` | Approval queue |
| GET | `/stats/challenges`, `/stats/events`, … | Admin overview details |

---

## Testing

### Automated (12 critical flows)

```bash
cd server && npm test
```

**26 tests** in `server/tests/api.test.js` cover the required flows:

| # | Flow | Test |
|---|---|---|
| 1 | Registration creates a pending account | ✓ never admin, bcrypt-hashed password |
| 2 | Pending users cannot access protected data | ✓ 403 `PENDING_APPROVAL` |
| 3 | Admin approval allows login | ✓ cookie set, HttpOnly |
| 4 | Non-admins cannot access admin APIs | ✓ 403 on stats/users/challenge-create |
| 5 | Members submit valid challenge work | ✓ status `submitted` |
| 6 | Invalid/late submissions rejected | ✓ missing field, wrong URL host, `DEADLINE_PASSED` |
| 7 | Admin reviews & scores | ✓ `POINTS_OUT_OF_RANGE`, exact award, re-review replaces (no double count) |
| 8 | Score reflected in leaderboard | ✓ points + completed count + rank |
| 9 | Single-vote polls reject double voting | ✓ `ALREADY_VOTED`, totals correct |
| 10 | Deadlines respected | ✓ `REGISTRATION_CLOSED`, `ALREADY_REGISTERED` |
| 11 | No profile tampering / privilege escalation | ✓ role/points immutable via `/users/me`, cross-user admin action blocked, no sensitive fields leaked |
| 12 | Login/logout/session lifecycle | ✓ invalid creds, `/me` after logout, bad token |

Extras: duplicate registration, auto-publish to community feed, participation-report consistency.

The suite opens its own temporary engine (data under the OS tmp dir) and cleans its fixtures before and after every run — it is safe to run while the dev server is up. Sibling processes that target the **same** data directory (e.g. `npm run seed:admin` while `npm run dev` is running) automatically attach to the live engine via the published `server/.data/mongo.uri` instead of opening a second one.

### Manual test checklist

| # | Steps | Expected |
|---|---|---|
| 1 | Register a new account, then try to log in | Stays `pending`; login shows **"Your account is waiting for admin approval. You will be able to access the team platform after verification."** |
| 2 | Admin → Approvals → reject with a reason | Member sees rejected state; cannot log in (`ACCOUNT_REJECTED`) |
| 3 | Admin approves a member → member logs in | Full dashboard access; role `member` in DB |
| 4 | Member opens any `/admin/*` URL directly | Redirected away; API answers 403 |
| 5 | Admin creates a challenge with 2 required fields, saves as draft | Not visible to members |
| 6 | Publish it → member opens detail page | Status active with countdown; submit button enabled |
| 7 | Submit without a required field | Inline validation: *"<label>" is required* |
| 8 | Submit a second time (resubmission allowed) | New attempt recorded; history shows both |
| 9 | Resubmit when `allowResubmission=false` or past deadline | `RESUBMISSION_NOT_ALLOWED` / `DEADLINE_PASSED` toast |
| 10 | Admin reviews: 200 points on a 100-point challenge | Rejected with *points out of range* |
| 11 | Review with valid points → member reloads dashboard | Points, completed challenges and leaderboard rank update immediately |
| 12 | Leaderboard tie-break | Equal points → more completed challenges first → earlier latest score first |
| 13 | Member votes twice in a single-choice poll | `ALREADY_VOTED` |
| 14 | Private event before/after registering | Meeting link hidden until registered |
| 15 | Register after the registration deadline | `REGISTRATION_CLOSED` |
| 16 | Approved submission with community visibility `auto` | Appears in feed; unlike/comment/report work; report shows in Admin → Moderation |
| 17 | Notifications | Approval, publish, review & event actions create notifications; badge count + mark-read work |
| 18 | PATCH `/api/users/me` with `{"role":"admin","points":9999}` via curl | Response keeps `member` role and unchanged points |
| 19 | Image uploads | Non-image files and files >2 MB are rejected; images are stored on Cloudinary |
| 20 | Participation report | Counts equal the member-by-member rows; percentage matches submissions |

## Security notes

- Passwords: **bcryptjs** (cost 10), never stored or returned in plain text
- Sessions: **JWT in HttpOnly, SameSite=Lax cookie** — no token in localStorage; CORS credential allowlist + Origin check on mutating requests (CSRF belt-and-braces)
- Roles/status enforced **server-side only** (`requireAuth → requireApproved → requireAdmin`); client-supplied `role`/`status`/`points` are ignored
- Auth rate limits: login 10 / 15 min, register 5 / h per IP
- Uploads: MIME whitelist + size caps (avatars 2 MB images; work files 8 MB images/pdf/zip/docx/txt), randomized filenames
- Input validation on every route; structured 4xx responses without stack traces (production)
- `.env` is git-ignored; `.env.example` documents every variable
- Directory/profile APIs strip `passwordHash`, emails stay private to the owner

## Deployment

1. `cd client && npm run build`
2. Set production env: `NODE_ENV=production`, `JWT_SECRET` (≥ 32 chars), `MONGODB_URI` (managed MongoDB), `CLIENT_URL`/`CORS_ORIGINS` if serving the SPA separately
3. `cd server && npm start` (single port: SPA + API + uploads)
4. Seed the first admin: `npm run seed:admin`
5. Put TLS in front (Caddy/Nginx/ingress); cookies are already `Secure`-ready in production

## How points & the leaderboard work

- Every admin review stores a `SubmissionReview` row (member, submission, points, status, reviewer, feedback); only the **latest** review per submission counts (`isLatest`).
- `User.points` = **sum of approved latest-review points** across the member's submissions — recomputed inside the review transaction, never incremented blindly, so re-reviews can't double count.
- `completedChallenges` = count of challenges with an approved latest submission; `lastScoredAt` records the most recent score timestamp.
- Leaderboard sort: **points ↓ → completedChallenges ↓ → lastScoredAt ↓** (deterministic tie-break), filtered `all-time` / `this month` / `this week`.
