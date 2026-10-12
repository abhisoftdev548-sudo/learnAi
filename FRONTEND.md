# LearnAI frontend

A responsive, light developer workspace built with **React 19, Vite, Tailwind CSS 4, React Router, Monaco Editor, and Lucide React**. Local DM Sans and JetBrains Mono fonts, restrained transitions, violet accents and reusable UI components. There is no application demo mode, mock server, hardcoded user/leaderboard statistics, or localStorage authentication.

The running frontend talks only to REST services. If the API is down, it shows an unavailable/error state; it does not fabricate a logged-in user or substitute sample data.

## Run it

Use Node **22.12+** (the installed Vite version requires it) and MongoDB 7+ configured as a replica set. The backend requires transactions. See [README.md](README.md) for database setup.

```bash
npm ci
cp .env.example .env
# Edit .env: MongoDB URI, JWT secret, CORS origins and seed-admin credentials.
npm run seed

# Terminal 1: the real API
npm run dev:server

# Terminal 2: the React frontend
npm run dev:client
```

Open **http://localhost:5173**. Both services bind to `0.0.0.0`. No frontend build output needs to be committed.

In this workspace, the Vite server is running as the **LearnAI frontend** live preview. A MongoDB URI was not supplied and no local MongoDB server is running, so the preview opens the actual sign-in page with an honest backend-connectivity notice. Protected data requires the real API/database to be available.

### Frontend environment

The root `.env.example` includes:

| Variable | Default | Used by |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Browser API prefix. Prefer a same-origin `/api` proxy. Can be a trusted absolute HTTPS API URL for a deliberate cross-origin deployment. |
| `API_PROXY_TARGET` | `http://127.0.0.1:5000` | Vite dev/preview **server only**; target for relative `/api` calls. This address is never used by browser code. |
| `CORS_ORIGINS` | `http://localhost:5173` | Existing backend setting. Include the exact URL from which the frontend is opened. |

Other backend-only settings remain `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `PORT`, `COOKIE_SAME_SITE`, `COOKIE_SECURE`, and `TRUST_PROXY`. **Never put a database URI, JWT secret, seed password, or other private key in a `VITE_*` variable. Vite embeds those variables in browser bundles.**

For Arena's HTTPS preview, add the exact preview origin to backend `CORS_ORIGINS`, and set `COOKIE_SECURE=true`. Do not add wildcard CORS origins. Restart services after changing `.env`. Vite permits `.e2b.app` preview hosts. The development proxy preserves the original Origin header: it does not bypass backend CSRF checks.

### Production

```bash
npm run build       # writes dist/
npm run preview     # local build smoke test on 4173, not a production server
```

For local preview testing, add `http://localhost:4173` to backend `CORS_ORIGINS`. The preview server proxies `/api` to `API_PROXY_TARGET` as the development server does.

Deploy `dist/` to an HTTPS static host with:

1. A SPA fallback to `index.html` for client routes such as `/history/:id`.
2. A real reverse proxy for `/api/*` to the Express API **before** that fallback.
3. Exact HTTPS `CORS_ORIGINS`, secure cookies and a correctly configured trusted proxy.
4. Same-site hosting where possible. Cross-site cookies need `SameSite=None; Secure` and may still be blocked by browser third-party-cookie policies.
5. If adding a frontend Content Security Policy, allow same-origin workers and the iframe `srcdoc` preview (including its inline code within its sandbox). Do not apply the backend's restrictive JSON-response Helmet CSP to the static application HTML unchanged; Monaco and the sandbox need a separate, tested frontend policy.

The existing `Dockerfile` remains **backend-only**. Host the built frontend separately or extend your deployment's reverse proxy. `npm run preview` is for inspection, not production serving.

## Folder structure

```text
src/
├── assets/
│   └── README.md
├── components/
│   ├── AchievementBadge.jsx
│   ├── ActivityCalendar.jsx
│   ├── ChallengeCard.jsx
│   ├── CodeEditor.jsx
│   ├── Preview.jsx
│   ├── Progress.jsx
│   ├── SubmissionResult.jsx
│   ├── SubmissionTable.jsx
│   ├── TestCaseBuilder.jsx
│   └── UI.jsx                   # buttons, fields, dialogs, badges, errors, skeletons
├── context/
│   ├── AuthContext.jsx          # cookie session bootstrap, expiry, current user
│   └── ToastContext.jsx
├── hooks/
│   └── useResource.js           # cancellable loading/errors, reload, debounce
├── layouts/
│   └── AppLayout.jsx            # responsive navigation, search, account menu
├── pages/
│   ├── AuthPage.jsx             # distinct login/register routes
│   ├── Dashboard.jsx
│   ├── Challenges.jsx
│   ├── Workspace.jsx
│   ├── Profile.jsx
│   ├── Leaderboard.jsx
│   ├── Achievements.jsx
│   ├── History.jsx              # list and individual submission
│   ├── Settings.jsx
│   └── admin/
│       ├── AdminOverview.jsx    # overview and statistics
│       ├── AdminChallenges.jsx
│       ├── AdminUsers.jsx
│       ├── AdminSubmissions.jsx
│       └── ChallengeForm.jsx
├── routes/
│   └── index.jsx               # lazy pages, authentication/admin guards, 404
├── services/
│   ├── api.js                  # credentialed fetch, timeout, envelope/errors
│   ├── authService.js
│   ├── challengeService.js
│   ├── submissionService.js
│   ├── userService.js
│   ├── leaderboardService.js
│   └── adminService.js
├── utils/
│   ├── challengeForm.js
│   ├── format.js
│   ├── frontend.test.js
│   └── preview.js
├── main.jsx
└── styles.css

public/favicon.svg
frontend-tests/
├── app.spec.js                 # desktop/mobile UI contract tests
└── fixtures.js                 # ONLY imported by tests, never by the frontend
index.html
vite.config.js
playwright.config.js
FRONTEND.md
```

Tailwind's Vite plugin and CSS import are active. Shared components use Tailwind utilities alongside reusable semantic CSS for the visual system. Components are organized by responsibility; network requests live in service modules rather than page-level fetch calls. Monaco and page modules are lazy-loaded. Monaco, workers, icons and fonts are served locally, with no editor/font CDN dependency.

## Screens and real API integration

All API calls use `credentials: 'include'`. The JWT remains in the HTTP-only cookie and is never read or stored by React. JSON success/error envelopes are handled centrally, with network/timeout errors and 401 session expiry handling. GET requests are abortable so stale requests do not overwrite new filter results. Writes are not automatically retried, avoiding duplicate submission attempts.

| Screen / function | REST calls |
|---|---|
| Login/register | `POST /api/auth/login`, `POST /api/auth/register` |
| Session bootstrap/logout | `GET /api/auth/me`, `POST /api/auth/logout` |
| Dashboard | `GET /api/users/me`, `/api/challenges`, `/api/submissions/me`, `/api/leaderboard`, `/api/teams/me` |
| Challenge library | `GET /api/challenges?category=&difficulty=&search=&page=&limit=` |
| Coding workspace | `GET /api/challenges/:id`, `GET /api/challenges/:id/progress`, `POST /api/submissions` |
| Profile | `GET /api/users/me` or `/api/users/:username`; own history uses `/api/submissions/me` |
| Settings | `PUT /api/users/me` (`name`, `bio`, HTTPS `avatar` only) |
| Rankings | `GET /api/leaderboard?period=weekly\|monthly\|all-time&page=&limit=` |
| Achievements | `GET /api/achievements` plus earned records and counters from `/api/users/me` |
| History / saved source | `GET /api/submissions/me`, `GET /api/submissions/:id` |
| Admin overview/statistics | `GET /api/admin/dashboard`, `GET /api/admin/teams` |
| Admin users and membership | `GET /api/admin/users`, `PUT /api/admin/users/:id/team` |
| Admin monitoring | `GET /api/admin/submissions` |
| Admin challenge management | `POST /api/admin/challenges`, `PUT /api/admin/challenges/:id`, `DELETE /api/admin/challenges/:id` |
| Create team | `POST /api/admin/teams` |

### Small database-backed additions to the existing backend

These were needed to render requested features without inventing data or crawling every submission page:

- Challenge listing accepts an escaped, bounded, **literal title search** and returns each requesting user's `completed` flag.
- `GET /api/challenges/:id/progress` returns persisted `{attempts, completed}` for the authenticated user.
- `GET /api/achievements` returns achievement definitions from MongoDB, allowing locked badges to be driven by actual requirements instead of a hardcoded frontend badge catalog.
- Profiles include daily UTC submission counts for the last 100 days. The calendar shows the latest 13 Monday-based weeks; future cells are not counted. All submissions count toward activity; only successful submissions advance the backend streak.
- Leaderboard rows include the effective current streak, reset to zero after missed days.

These are additions to the real Mongoose service/controller/routes, with authorization intact—not simulated backend endpoints. Deploy these backend updates with the frontend.

### Interaction details

- Sidebar collapses to a mobile drawer with Escape handling, focus trapping, and `inert` off-screen content.
- Search and category/difficulty filters persist in the URL; paging/filter changes call the backend.
- Inputs have connected labels and descriptive hints, dialogs use native modal focus behavior, and buttons have accessible names. Reduced-motion preferences are respected.
- Empty collections, errors, loading skeletons, validation failures and backend unavailability have explicit UI states.
- Forms send only supported fields. Registration verifies password confirmation client-side and leaves uniqueness to the database. Admin test cases are structured allowlisted checks, not executable strings.
- Admin edits are disabled when a challenge already has submissions. Archiving requires confirmation and preserves history.
- Successful submissions show the **API's score, test counts, attempt number, time, status, earned XP and achievements**; React does not calculate reward results.
- Unsubmitted workspace edits stay in memory only. Reset and route-leave confirmations protect against accidental loss; browser refresh prompts if edits are unsaved. Successful submissions can be reopened from history as read-only source.
- User profiles may be viewed through `/profile/:username`, but only the owner receives their private submission history.
- Settings update profile details and can revoke all sessions. No unsupported password-change or email-change endpoint is invented.

## Preview security and scoring limitations

`src/components/Preview.jsx` renders `srcdoc` with **only `sandbox="allow-scripts"`**, never `allow-same-origin`. HTML/CSS/JS are not injected into the React DOM and no submitted JavaScript is evaluated by the parent app.

The preview's CSP blocks fetch/XHR, frames, workers, form submission, fonts, external scripts and other external resources. Inline CSS/JS and data/blob images are allowed. Browser tests verify that submitted JS runs inside the iframe, cannot read `parent.document`, and cannot fetch external resources. The preview does not send pass/fail results to the API.

**Important boundaries:**

- Run is explicit, not on every keystroke. Previews pause after 30 seconds and have Stop/Restart controls.
- An iframe is **not a CPU/memory containment boundary**. Infinite loops may freeze its renderer (potentially the tab) and cannot be guaranteed to stop via a parent timer. Use an isolated execution service/separate-origin dedicated preview infrastructure for adversarial or high-stakes code.
- CSP resource blocking is not a complete network-isolation boundary for every browser navigation mechanism. Avoid putting secrets in submitted source; stronger execution infrastructure is required for untrusted shared programs.
- External packages, images, fonts and network calls intentionally do not load in previews. Full-document markup is parsed as part of the generated `srcdoc`; use the source fields as a markup fragment, stylesheet and JavaScript module.
- Scoring remains the backend's deterministic `static-v1` evaluator. Static AST/markup checks do not prove functionality, computed layout, accessibility completeness or visual correctness.
- Suggested time is advisory. `timeTaken` is elapsed time reported by the client; server-side timed competition sessions are not implemented.
- On a submission request timeout, the API may still have recorded the attempt. The UI refreshes the persisted attempt count and does **not** automatically resubmit. Check History before retrying if uncertain.
- Monaco is large (~multiple MB with language workers), but is only loaded for editing/read-only code pages. Initial authentication/dashboard bundles do not eagerly load it. Browser tests cover Chromium desktop and Android-sized emulation, not native iOS Safari or every assistive technology.

## Tests and verification

```bash
npm test                  # 62 fast tests: backend + frontend utility contracts
npm run check             # backend syntax checks
npm run format:check      # frontend/test formatting
npm run build             # production Vite build
npm audit                 # dependency advisories

# Browser tests on a typical development/CI machine:
npx playwright install --with-deps chromium
npm run test:frontend

# Restricted Linux sandbox with the bundled portable Chromium dev dependency:
PORTABLE_CHROMIUM=1 npm run test:frontend

# Real MongoDB integration (see backend README; erases disposable *_test DB):
TEST_MONGODB_URI='mongodb://127.0.0.1:27017/learnai_test?replicaSet=rs0' npm run test:integration
```

**Verified in this workspace:**

- 62 fast tests passed.
- 28 Playwright checks passed across desktop and mobile Chromium projects, including tablet-width overflow checks.
- Tested login/register validation, logout, cookie-contract requests, dashboard rendering, server filter parameters, Monaco editing, isolated preview execution, submission/result rendering, reset/navigation protection, profile, leaderboard periods, achievements, history/source views, settings updates, admin guards and challenge create/edit/archive forms.
- Production build and backend syntax checks passed.
- Dependency audit reported **0 known vulnerabilities** at implementation time. A compatible DOMPurify override updates Monaco's transitive dependency to a patched version.

**Not verified against a live database here:** browser tests use explicit test-only API contract fixtures under `frontend-tests/`. Those fixtures are never imported into the application or shipped in production. They establish frontend behavior and request shapes, **not** real database persistence/authentication. No live MongoDB URI was supplied; the prior real integration attempt was blocked by the restricted MongoDB binary-download host. The 13-test MongoDB suite remains unexecuted successfully in this environment. Run it and a full browser session against your actual disposable replica set before treating the deployment as end-to-end verified.

CI contains separate backend and frontend jobs. The frontend job builds the app and runs Playwright; the backend job separately runs real replica-set integration tests in an environment with MongoDB binary download access.

## Remaining API/product limitations

- The bell opens an honest informational state. There is no notifications-feed API, no invented unread count, and no fake notification entries.
- Password reset, password/email changes and avatar uploads are not supported by the current backend. Avatar editing accepts an HTTPS URL.
- Team membership is admin-managed, one team per user. Membership suggestions show the first 100 teams; admins can enter another valid team ID manually. No invitations, team chat or team-scoped competitions are invented.
- Admin submission monitoring follows the backend privacy contract: it shows metadata, not other users' source code.
- Challenge search is title-only. Statistics use available database aggregates, not fabricated chart series.
- Local editor drafts are not persisted across refreshes/devices; only submitted source is persisted by the backend.
- The recommendation is an unsolved item from the latest available challenges, not an AI recommendation engine.
