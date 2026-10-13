import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { LEADERBOARD_PERIODS, SUBMISSION_STATUS } from '../config/constants.js';
import { streakStatus } from './streak.service.js';

/** Start of the current week (Monday, 00:00 UTC). */
export function startOfWeek(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

export function startOfMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function periodWindow(period, now = new Date()) {
  switch (period) {
    case 'weekly':
      return { from: startOfWeek(now), to: now };
    case 'monthly':
      return { from: startOfMonth(now), to: now };
    default:
      return { from: null, to: now };
  }
}

/**
 * Leaderboard for a period.
 *  - weekly / monthly: XP earned from submissions inside the window
 *  - all-time: the user's lifetime XP
 * Every entry reports rank, user, XP, challenges solved, average score and streak.
 */
export async function getLeaderboard({ period = 'all-time', limit = 25, currentUserId = null } = {}) {
  const safePeriod = LEADERBOARD_PERIODS.includes(period) ? period : 'all-time';
  const window = periodWindow(safePeriod);

  const rows = safePeriod === 'all-time' ? await allTimeRows() : await windowedRows(window);
  const ranked = rows.map((row, index) => ({ ...row, rank: index + 1 }));
  const entries = ranked.slice(0, limit).map((row) => decorate(row, currentUserId));
  const meRow = currentUserId ? ranked.find((row) => String(row.userId) === String(currentUserId)) : null;

  return {
    period: safePeriod,
    window: { from: window.from, to: window.to },
    entries,
    me: meRow ? decorate(meRow, currentUserId) : null,
    totals: {
      participants: ranked.length,
      xp: ranked.reduce((sum, row) => sum + row.xp, 0),
      averageScore: ranked.length ? Math.round((ranked.reduce((sum, row) => sum + row.averageScore, 0) / ranked.length) * 10) / 10 : 0,
    },
    generatedAt: new Date(),
  };
}

async function windowedRows(window) {
  const match = { submittedAt: { $gte: window.from, $lte: window.to } };
  const [activity, solved] = await Promise.all([
    Submission.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          xp: { $sum: '$xpEarned' },
          averageScore: { $avg: '$score' },
          submissions: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ['$status', SUBMISSION_STATUS.PASSED] }, 1, 0] } },
          challenges: { $addToSet: '$challengeId' },
          lastSubmissionAt: { $max: '$submittedAt' },
        },
      },
    ]),
    Submission.aggregate([
      { $match: { ...match, status: SUBMISSION_STATUS.PASSED } },
      { $group: { _id: '$userId', solvedChallenges: { $addToSet: '$challengeId' } } },
    ]),
  ]);

  const solvedMap = new Map(solved.map((row) => [String(row._id), row.solvedChallenges?.length ?? 0]));
  const users = await loadUsers(activity.map((row) => row._id));

  return activity
    .filter((row) => users.has(String(row._id)))
    .map((row) => buildRow(row._id, users.get(String(row._id)), {
      xp: Math.round(row.xp ?? 0),
      averageScore: round1(row.averageScore),
      submissions: row.submissions ?? 0,
      passedSubmissions: row.passed ?? 0,
      challengesSolved: solvedMap.get(String(row._id)) ?? 0,
      challengesAttempted: row.challenges?.length ?? 0,
      lastSubmissionAt: row.lastSubmissionAt,
    }))
    .sort(compareRows);
}

async function allTimeRows() {
  const users = await User.find({}, 'name username avatar xp level currentStreak longestStreak challengesSolved solvedChallenges perfectScores lastActiveAt')
    .sort({ xp: -1, challengesSolved: -1 })
    .limit(500)
    .lean();

  const ids = users.map((user) => user._id);
  const aggregates = await Submission.aggregate([
    { $match: { userId: { $in: ids } } },
    { $group: { _id: '$userId', averageScore: { $avg: '$score' }, submissions: { $sum: 1 }, bestScore: { $max: '$score' } } },
  ]);
  const statsMap = new Map(aggregates.map((row) => [String(row._id), row]));

  return users
    .map((user) => {
      const stats = statsMap.get(String(user._id));
      return buildRow(user._id, user, {
        xp: user.xp ?? 0,
        averageScore: round1(stats?.averageScore ?? 0),
        submissions: stats?.submissions ?? 0,
        bestScore: stats?.bestScore ?? 0,
        challengesSolved: user.challengesSolved ?? user.solvedChallenges?.length ?? 0,
        challengesAttempted: user.solvedChallenges?.length ?? 0,
      });
    })
    .sort(compareRows);
}

function compareRows(a, b) {
  if (b.xp !== a.xp) return b.xp - a.xp;
  if (b.challengesSolved !== a.challengesSolved) return b.challengesSolved - a.challengesSolved;
  if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
  return String(a.username).localeCompare(String(b.username));
}

async function loadUsers(ids) {
  const users = await User.find({ _id: { $in: ids } }, 'name username avatar xp level currentStreak longestStreak challengesSolved solvedChallenges').lean();
  return new Map(users.map((user) => [String(user._id), user]));
}

function buildRow(userId, user, metrics) {
  return {
    userId: String(userId),
    name: user?.name ?? 'Unknown user',
    username: user?.username ?? 'unknown',
    avatar: user?.avatar ?? '',
    level: user?.level ?? 1,
    lifetimeXp: user?.xp ?? 0,
    currentStreak: user ? streakStatus(user).currentStreak : 0,
    longestStreak: user ? Math.max(user.longestStreak ?? 0, user.currentStreak ?? 0) : 0,
    ...metrics,
    xp: metrics.xp ?? 0,
    challengesSolved: metrics.challengesSolved ?? 0,
    averageScore: metrics.averageScore ?? 0,
  };
}

function decorate(row, currentUserId) {
  return {
    rank: row.rank,
    userId: row.userId,
    name: row.name,
    username: row.username,
    avatar: row.avatar,
    level: row.level,
    xp: row.xp,
    lifetimeXp: row.lifetimeXp,
    challengesSolved: row.challengesSolved,
    challengesAttempted: row.challengesAttempted ?? row.challengesSolved,
    averageScore: row.averageScore,
    submissions: row.submissions ?? 0,
    bestScore: row.bestScore ?? 0,
    currentStreak: row.currentStreak ?? 0,
    longestStreak: row.longestStreak ?? 0,
    lastSubmissionAt: row.lastSubmissionAt ?? null,
    isCurrentUser: currentUserId ? String(row.userId) === String(currentUserId) : false,
  };
}

function round1(value) {
  return value ? Math.round(value * 10) / 10 : 0;
}

/** Compact podium/leaderboard preview used by the landing page. */
export async function getLeaderboardPreview(limit = 5) {
  const leaderboard = await getLeaderboard({ period: 'all-time', limit });
  return {
    period: leaderboard.period,
    entries: leaderboard.entries.map(({ rank, name, username, avatar, xp, challengesSolved, averageScore, currentStreak, level }) => ({
      rank,
      name,
      username,
      avatar,
      xp,
      level,
      challengesSolved,
      averageScore,
      currentStreak,
    })),
    totals: leaderboard.totals,
  };
}

export default { getLeaderboard, getLeaderboardPreview, periodWindow, startOfWeek, startOfMonth };
