// Test-only API contract fixtures. Not imported by src, not served by the application.
// These are UI checks, NOT proof of live MongoDB/auth integration.
export const user = {
  _id: "a".repeat(24),
  name: "Test Developer",
  username: "test_developer",
  email: "test@example.com",
  role: "user",
  avatar: "",
  bio: "Testing the frontend contract.",
  xp: 80,
  level: 1,
  challengesSolved: 1,
  totalScore: 100,
  submissionCount: 1,
  currentStreak: 1,
  longestStreak: 1,
  averageScore: 100,
  bestScore: 100,
  categorySolved: { HTML: 1, CSS: 0, JavaScript: 0 },
  createdAt: "2026-10-01T00:00:00.000Z",
  progress: {
    HTML: { solved: 1, total: 2, percentage: 50 },
    CSS: { solved: 0, total: 1, percentage: 0 },
    JavaScript: { solved: 0, total: 1, percentage: 0 },
  },
  achievements: [
    {
      _id: "e".repeat(24),
      achievementId: {
        _id: "d".repeat(24),
        key: "first-challenge",
        name: "First Challenge",
        metric: "challengesSolved",
        threshold: 1,
        description: "Complete your first challenge.",
      },
      earnedAt: "2026-10-12T00:00:00.000Z",
    },
  ],
  activity: [
    { _id: new Date().toISOString().slice(0, 10), count: 1, passed: 1 },
  ],
};
export const challenge = {
  _id: "b".repeat(24),
  title: "Semantic Profile Card",
  description: "Build a profile card with a semantic heading.",
  category: "HTML",
  difficulty: "Easy",
  instructions: ["Add an h1 inside main."],
  hints: ["Use a main element."],
  starterHTML: "<main><h1>Starter preview</h1></main>",
  starterCSS: "h1 { color: rebeccapurple; }",
  starterJS: "// Write your code here",
  testCases: [
    {
      type: "html-selector",
      label: "A semantic heading exists",
      group: "structure",
      selector: "main h1",
      minCount: 1,
    },
  ],
  xp: 50,
  maxAttempts: 3,
  timeLimit: 600,
  submissionCount: 0,
  solvedCount: 0,
  completed: false,
};
export const challenges = [
  challenge,
  {
    ...challenge,
    _id: "c".repeat(24),
    title: "Flexbox Fundamentals",
    category: "CSS",
    difficulty: "Medium",
    xp: 100,
  },
];
export const submission = {
  _id: "f".repeat(24),
  userId: user._id,
  challengeId: challenge,
  category: "HTML",
  score: 100,
  testsPassed: 1,
  totalTests: 1,
  xpEarned: 80,
  attemptNumber: 1,
  timeTaken: 20,
  status: "passed",
  submittedAt: "2026-10-12T08:00:00.000Z",
  htmlCode: "<main><h1>Saved code</h1></main>",
  cssCode: "",
  jsCode: "",
  testResults: [{ label: "A semantic heading exists", passed: true }],
  evaluationMode: "static-v1",
};
export async function installContractFixtures(
  page,
  { authenticated = true, admin = false } = {},
) {
  let signedIn = authenticated;
  const current = { ...user, role: admin ? "admin" : "user" };
  const requests = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const body = request.postDataJSON();
    requests.push({ path, search: url.search, method: request.method(), body });
    const send = (data) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Contract fixture",
          data,
        }),
      });
    const fail = (status, message) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message }),
      });
    if (path === "/api/auth/login" || path === "/api/auth/register") {
      signedIn = true;
      return send(current);
    }
    if (path === "/api/auth/logout") {
      signedIn = false;
      return send({});
    }
    if (!signedIn) return fail(401, "Unauthorized");
    if (
      path === "/api/auth/me" ||
      path === "/api/users/me" ||
      path === `/api/users/${user.username}`
    )
      return send(
        request.method() === "PUT" ? { ...current, ...body } : current,
      );
    if (path === "/api/challenges") {
      const items = challenges.filter(
        (c) =>
          (!url.searchParams.get("category") ||
            c.category === url.searchParams.get("category")) &&
          (!url.searchParams.get("difficulty") ||
            c.difficulty === url.searchParams.get("difficulty")) &&
          (!url.searchParams.get("search") ||
            c.title
              .toLowerCase()
              .includes(url.searchParams.get("search").toLowerCase())),
      );
      return send({ items, total: items.length, page: 1, limit: 12 });
    }
    if (path.match(/^\/api\/challenges\/[^/]+\/progress$/))
      return send({ attempts: 0, completed: false });
    if (path.match(/^\/api\/challenges\/[^/]+$/))
      return send(challenges.find((c) => path.endsWith(c._id)) || challenge);
    if (path === "/api/submissions" && request.method() === "POST")
      return send({
        submission: { ...submission, ...body },
        achievements: [],
        level: 1,
        currentStreak: 1,
      });
    if (path === "/api/submissions/me")
      return send({ items: [submission], total: 1, page: 1, limit: 20 });
    if (path === `/api/submissions/${submission._id}`) return send(submission);
    if (path === "/api/leaderboard") {
      const entry = { ...current, rank: 1 };
      return send({ items: [entry], me: entry, total: 1, page: 1, limit: 20 });
    }
    if (path === "/api/achievements")
      return send([
        user.achievements[0].achievementId,
        {
          _id: "9".repeat(24),
          key: "ten-challenges",
          name: "10 Challenges",
          description: "Solve ten challenges.",
          metric: "challengesSolved",
          threshold: 10,
        },
      ]);
    if (path === "/api/teams/me") return send(null);
    if (path === "/api/admin/dashboard")
      return send({
        totalUsers: 1,
        totalChallenges: 2,
        totalSubmissions: 1,
        activeUsers: 1,
        averageScore: 100,
        mostPopularCategory: "HTML",
      });
    if (path === "/api/admin/teams")
      return send({ items: [], total: 0, page: 1, limit: 20 });
    if (path === "/api/admin/users")
      return send({ items: [current], total: 1, page: 1, limit: 20 });
    if (path === "/api/admin/submissions")
      return send({
        items: [{ ...submission, userId: current }],
        total: 1,
        page: 1,
        limit: 20,
      });
    if (path.startsWith("/api/admin/challenges"))
      return send({ ...challenge, ...body });
    return fail(404, "No test fixture for this endpoint");
  });
  return requests;
}
