import Submission from '../models/Submission.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { CATEGORIES } from '../config/constants.js';
import { levelProgress } from './xp.service.js';
import { streakStatus } from './streak.service.js';
import { getChallengeMeta, getProgressMap } from './challenge.service.js';
import { serializeSubmission } from './submission.service.js';
import { achievementOverview } from './achievement.service.js';
import { sanitizeText } from '../utils/validate.js';

/** Aggregate submission metrics for a user in one aggregation. */
export async function getSubmissionMetrics(userId) {
  const [totals] = await Submission.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        submissions: { $sum: 1 },
        averageScore: { $avg: '$score' },
        bestScore: { $max: '$score' },
        totalTime: { $sum: '$timeTaken' },
        passedSubmissions: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } },
        xpEarned: { $sum: '$xpEarned' },
        perfectSubmissions: { $sum: { $cond: [{ $eq: ['$score', 100] }, 1, 0] } },
        firstAttemptPasses: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'passed'] }, { $eq: ['$attemptNumber', 1] }] }, 1, 0] } },
      },
    },
  ]);

  return {
    submissions: totals?.submissions ?? 0,
    averageScore: totals?.averageScore ? Math.round(totals.averageScore * 10) / 10 : 0,
    bestScore: totals?.bestScore ?? 0,
    totalTime: totals?.totalTime ?? 0,
    passedSubmissions: totals?.passedSubmissions ?? 0,
    xpEarned: totals?.xpEarned ?? 0,
    perfectSubmissions: totals?.perfectSubmissions ?? 0,
    firstAttemptPasses: totals?.firstAttemptPasses ?? 0,
  };
}

/** Per-category progress: how much of HTML / CSS / JavaScript the user covers. */
export async function getCategoryProgress(user) {
  const { challenges, totalsByCategory } = await getChallengeMeta();
  const published = challenges.filter((challenge) => challenge.isPublished);

  // Attempts + best score per challenge for this user.
  const submissionRows = await Submission.aggregate([
    { $match: { userId: user._id } },
    { $group: { _id: '$challengeId', attempts: { $sum: 1 }, bestScore: { $max: '$score' }, averageScore: { $avg: '$score' } } },
  ]);
  const byChallenge = new Map(submissionRows.map((row) => [String(row._id), row]));

  const solvedByCategory = new Map(CATEGORIES.map((category) => [category, []]));
  for (const entry of user.solvedChallenges ?? []) {
    if (solvedByCategory.has(entry.category)) solvedByCategory.get(entry.category).push(entry);
  }

  return CATEGORIES.map((category) => {
    const categoryChallenges = published.filter((challenge) => challenge.category === category);
    const total = categoryChallenges.length || totalsByCategory[category] || 0;
    const solvedEntries = solvedByCategory.get(category) ?? [];
    let attempted = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    for (const challenge of categoryChallenges) {
      const row = byChallenge.get(String(challenge._id));
      if (row) {
        attempted += 1;
        scoreSum += row.bestScore ?? 0;
        scoreCount += 1;
      }
    }

    const solved = solvedEntries.length;
    return {
      category,
      key: category.toLowerCase(),
      total,
      solved,
      attempted,
      remaining: Math.max(0, total - solved),
      percent: total ? Math.round((solved / total) * 100) : 0,
      averageScore: scoreCount ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0,
      bestScore: solvedEntries.reduce((best, entry) => Math.max(best, entry.score ?? 0), 0),
    };
  });
}

/** Everything the dashboard/profile pages need for one user. */
export async function getUserStats(user, { includeRecent = true } = {}) {
  const [metrics, categoryProgress, rank, { byId }, calendar] = await Promise.all([
    getSubmissionMetrics(user._id),
    getCategoryProgress(user),
    User.countDocuments({ xp: { $gt: user.xp ?? 0 } }),
    getChallengeMeta(),
    import('./submission.service.js').then((module) => module.getActivityCalendar({ userId: user._id, days: 91 })),
  ]);

  const streak = streakStatus(user);
  const totalChallenges = [...byId.values()].filter((challenge) => challenge.isPublished).length;
  const solvedIds = new Set((user.solvedChallenges ?? []).map((entry) => String(entry.challenge)));

  let recentSubmissions = [];
  if (includeRecent) {
    const recent = await Submission.find({ userId: user._id }).sort({ submittedAt: -1 }).limit(5).lean();
    recentSubmissions = recent.map((submission) => serializeSubmission(submission, byId.get(String(submission.challengeId))));
  }

  return {
    xp: user.xp ?? 0,
    level: user.level ?? 1,
    levelProgress: levelProgress(user.xp ?? 0),
    rank: rank + 1,
    totalChallenges,
    challengesSolved: user.challengesSolved ?? solvedIds.size,
    challengesRemaining: Math.max(0, totalChallenges - (user.challengesSolved ?? solvedIds.size)),
    completionPercent: totalChallenges ? Math.round(((user.challengesSolved ?? 0) / totalChallenges) * 100) : 0,
    totalScore: user.totalScore ?? 0,
    averageScore: metrics.averageScore,
    bestScore: metrics.bestScore,
    perfectScores: user.perfectScores ?? metrics.perfectSubmissions,
    firstAttemptSuccesses: user.firstAttemptSuccesses ?? metrics.firstAttemptPasses,
    submissions: metrics.submissions,
    passedSubmissions: metrics.passedSubmissions,
    xpEarnedFromSubmissions: metrics.xpEarned,
    timePracticedSeconds: metrics.totalTime,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    practicedToday: streak.practicedToday,
    streakAtRisk: streak.atRisk,
    lastPracticeDate: user.lastPracticeDate,
    achievements: {
      earned: user.achievements?.length ?? 0,
    },
    categoryProgress,
    recentSubmissions,
    calendar,
  };
}

/** Public profile (any signed-in user can view). */
export async function getPublicProfile({ username, viewer = null }) {
  const user = await User.findOne({ username: String(username).toLowerCase() });
  if (!user) throw ApiError.notFound('User not found');

  const stats = await getUserStats(user, { includeRecent: false });
  const { byId } = await getChallengeMeta();
  const recent = await Submission.find({ userId: user._id }).sort({ submittedAt: -1 }).limit(8).lean();
  const achievements = await achievementOverview(user, {
    categoryTotals: stats.categoryProgress.reduce((acc, entry) => {
      acc[entry.category] = entry.total;
      return acc;
    }, {}),
  });

  const recentSubmissions = recent.map((submission) => {
    const challenge = byId.get(String(submission.challengeId));
    const entry = serializeSubmission(submission, challenge);
    // Public profiles do not leak other people's source code.
    return { ...entry, canViewCode: viewer ? String(viewer._id) === String(user._id) || viewer.role === 'admin' : false };
  });

  const categorySolved = (user.solvedChallenges ?? []).reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    user: user.toPublicJSON(),
    stats,
    achievements: {
      summary: achievements.summary,
      earned: achievements.items.filter((item) => item.earned),
    },
    categoryStats: stats.categoryProgress,
    solvedByCategory: categorySolved,
    submissions: recentSubmissions,
    isSelf: viewer ? String(viewer._id) === String(user._id) : false,
  };
}

/** Update the signed-in user's own profile. */
export async function updateProfile(user, payload = {}) {
  const updates = {};

  if (payload.name !== undefined) {
    const name = sanitizeText(String(payload.name), { maxLength: 80 });
    if (name.length < 2) throw ApiError.unprocessable('Name must be at least 2 characters', [{ field: 'name' }]);
    updates.name = name;
  }
  if (payload.bio !== undefined) {
    updates.bio = sanitizeText(String(payload.bio), { maxLength: 280 });
  }
  if (payload.avatar !== undefined) {
    const avatar = String(payload.avatar).trim();
    if (avatar && !/^(https?:\/\/|data:image\/)/i.test(avatar)) {
      throw ApiError.unprocessable('Avatar must be an http(s) URL or a data:image URI', [{ field: 'avatar' }]);
    }
    if (avatar.length > 20000) throw ApiError.unprocessable('Avatar URI is too large', [{ field: 'avatar' }]);
    updates.avatar = avatar;
  }
  if (payload.preferences !== undefined) {
    const prefs = payload.preferences ?? {};
    updates.preferences = {
      editorFontSize: clampNumber(prefs.editorFontSize, 10, 24, user.preferences?.editorFontSize ?? 14),
      editorTheme: ['light', 'dark'].includes(prefs.editorTheme) ? prefs.editorTheme : user.preferences?.editorTheme ?? 'light',
      tabSize: clampNumber(prefs.tabSize, 2, 8, user.preferences?.tabSize ?? 2),
      autoRun: typeof prefs.autoRun === 'boolean' ? prefs.autoRun : Boolean(user.preferences?.autoRun),
    };
  }

  if (updates.avatar === '') {
    const { buildAvatarUrl } = await import('./auth.service.js');
    updates.avatar = buildAvatarUrl(user.username, updates.name ?? user.name);
  }

  Object.assign(user, updates);
  await user.save();
  return user;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

/** Recommended challenge for the dashboard. */
export async function getRecommendedChallenge(user) {
  const { challenges } = await getChallengeMeta();
  const published = challenges.filter((challenge) => challenge.isPublished).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const progressMap = await getProgressMap(user, published.map((challenge) => challenge._id));
  const unsolved = published.filter((challenge) => !progressMap.get(String(challenge._id))?.solved);
  const notAttempted = unsolved.filter((challenge) => !(progressMap.get(String(challenge._id))?.attemptsUsed > 0));
  const pick = notAttempted[0] ?? unsolved[0] ?? null;
  if (!pick) return null;
  return {
    id: String(pick._id),
    title: pick.title,
    slug: pick.slug,
    description: pick.description,
    category: pick.category,
    difficulty: pick.difficulty,
    xp: pick.xp,
    timeLimit: pick.timeLimit,
    progress: progressMap.get(String(pick._id)) ?? null,
  };
}

export default { getUserStats, getPublicProfile, updateProfile, getCategoryProgress, getSubmissionMetrics, getRecommendedChallenge };
