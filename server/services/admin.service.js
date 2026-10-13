import Challenge from '../models/Challenge.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import ApiError from '../utils/ApiError.js';
import { CATEGORIES, DIFFICULTIES } from '../config/constants.js';
import { getChallengeMeta } from './challenge.service.js';
import { serializeSubmission, formatDuration } from './submission.service.js';
import { listExecutionProviders } from './execution/index.js';

/** Active user = practiced (or signed in) within the last `days` days. */
export async function getDashboardStats({ activeDays = 7 } = {}) {
  const since = new Date(Date.now() - activeDays * 24 * 60 * 60 * 1000);
  const [users, activeUsers, admins, challenges, publishedChallenges, submissions, pendingToday, aggregates, recentUsers, recentSubmissions, dailyActivity, popularity] =
    await Promise.all([
      User.countDocuments({}),
      Submission.distinct('userId', { submittedAt: { $gte: since } }).then((ids) => ids.length),
      User.countDocuments({ role: 'admin' }),
      Challenge.countDocuments({}),
      Challenge.countDocuments({ isPublished: true }),
      Submission.countDocuments({}),
      Submission.countDocuments({ submittedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      Submission.aggregate([
        {
          $group: {
            _id: null,
            averageScore: { $avg: '$score' },
            bestScore: { $max: '$score' },
            passed: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } },
            averageTime: { $avg: '$timeTaken' },
            averageAttempts: { $avg: '$attemptNumber' },
          },
        },
      ]),
      User.find({}, 'name username avatar role xp level createdAt').sort({ createdAt: -1 }).limit(5).lean(),
      Submission.find({}).sort({ submittedAt: -1 }).limit(8).lean(),
      Submission.aggregate([
        { $match: { submittedAt: { $gte: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
            submissions: { $sum: 1 },
            users: { $addToSet: '$userId' },
            averageScore: { $avg: '$score' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Submission.aggregate([
        { $group: { _id: '$challengeId', attempts: { $sum: 1 }, solvers: { $addToSet: { $cond: [{ $eq: ['$status', 'passed'] }, '$userId', null] } }, averageScore: { $avg: '$score' } } },
        { $sort: { attempts: -1 } },
        { $limit: 50 },
      ]),
    ]);

  const { byId } = await getChallengeMeta();
  const categoryStats = CATEGORIES.map((category) => {
    const categoryChallenges = [...byId.values()].filter((challenge) => challenge.category === category);
    const attempts = popularity
      .filter((row) => categoryChallenges.some((challenge) => String(challenge._id) === String(row._id)))
      .reduce((sum, row) => sum + row.attempts, 0);
    return { category, challenges: categoryChallenges.length, attempts };
  }).sort((a, b) => b.attempts - a.attempts);

  const difficultyStats = DIFFICULTIES.map((difficulty) => ({
    difficulty,
    challenges: [...byId.values()].filter((challenge) => challenge.difficulty === difficulty).length,
  }));

  const total = aggregates[0] ?? {};

  return {
    users: { total: users, active: activeUsers, admins, newThisWeek: await User.countDocuments({ createdAt: { $gte: since } }) },
    challenges: { total: challenges, published: publishedChallenges, drafts: challenges - publishedChallenges },
    submissions: {
      total: submissions,
      last24h: pendingToday,
      averageScore: total.averageScore ? Math.round(total.averageScore * 10) / 10 : 0,
      bestScore: total.bestScore ?? 0,
      passRate: submissions ? Math.round(((total.passed ?? 0) / submissions) * 100) : 0,
      averageTime: Math.round(total.averageTime ?? 0),
      averageAttempts: Math.round((total.averageAttempts ?? 0) * 10) / 10,
    },
    popularCategories: categoryStats,
    difficultyDistribution: difficultyStats,
    dailyActivity: dailyActivity.map((row) => ({
      date: row._id,
      submissions: row.submissions,
      users: row.users?.filter(Boolean).length ?? 0,
      averageScore: row.averageScore ? Math.round(row.averageScore) : 0,
    })),
    recentUsers: recentUsers.map((user) => ({
      id: String(user._id),
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      xp: user.xp,
      level: user.level,
      createdAt: user.createdAt,
    })),
    recentSubmissions: recentSubmissions.map((submission) => {
      const challenge = byId.get(String(submission.challengeId));
      return {
        ...serializeSubmission(submission, challenge),
        userId: String(submission.userId),
      };
    }),
    execution: {
      providers: listExecutionProviders(),
      achievements: await Achievement.countDocuments({}),
    },
    generatedAt: new Date(),
  };
}

/** Team statistics page: category, difficulty and activity breakdowns. */
export async function getTeamStatistics({ days = 30 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [perChallenge, perCategoryScores, streakBuckets, xpBuckets, topPerformers, activity, attemptsDistribution] = await Promise.all([
    Submission.aggregate([
      { $group: { _id: '$challengeId', attempts: { $sum: 1 }, averageScore: { $avg: '$score' }, bestScore: { $max: '$score' }, passed: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } } } },
      { $sort: { attempts: -1 } },
    ]),
    Submission.aggregate([{ $group: { _id: '$score', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    User.aggregate([{ $group: { _id: '$currentStreak', users: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    User.aggregate([{ $group: { _id: { $subtract: ['$level', 1] }, users: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    User.find({}, 'name username avatar xp level challengesSolved currentStreak perfectScores').sort({ xp: -1 }).limit(5).lean(),
    Submission.aggregate([
      { $match: { submittedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
          submissions: { $sum: 1 },
          xp: { $sum: '$xpEarned' },
          averageScore: { $avg: '$score' },
          activeUsers: { $addToSet: '$userId' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Submission.aggregate([{ $group: { _id: '$attemptNumber', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);

  const { byId, challenges } = await getChallengeMeta();

  const categoryBreakdown = CATEGORIES.map((category) => {
    const ids = new Set([...byId.values()].filter((challenge) => challenge.category === category).map((challenge) => String(challenge._id)));
    const rows = perChallenge.filter((row) => ids.has(String(row._id)));
    const attempts = rows.reduce((sum, row) => sum + row.attempts, 0);
    const passed = rows.reduce((sum, row) => sum + row.passed, 0);
    const averageScore = rows.length ? rows.reduce((sum, row) => sum + (row.averageScore ?? 0), 0) / rows.length : 0;
    return {
      category,
      challenges: challenges.filter((challenge) => challenge.category === category).length,
      attempts,
      passedSubmissions: passed,
      completionRate: attempts ? Math.round((passed / attempts) * 100) : 0,
      averageScore: Math.round(averageScore * 10) / 10,
    };
  });

  const hardest = perChallenge
    .map((row) => {
      const challenge = byId.get(String(row._id));
      return {
        challengeId: String(row._id),
        title: challenge?.title ?? 'Deleted challenge',
        category: challenge?.category ?? '—',
        difficulty: challenge?.difficulty ?? '—',
        attempts: row.attempts,
        passRate: row.attempts ? Math.round((row.passed / row.attempts) * 100) : 0,
        averageScore: Math.round((row.averageScore ?? 0) * 10) / 10,
        bestScore: row.bestScore ?? 0,
        averageAttemptsPerUser: challenge ? Math.round((row.attempts / Math.max(1, challenges.length)) * 10) / 10 : 0,
      };
    })
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 6);

  const scoreDistribution = Array.from({ length: 10 }, (_, index) => {
    const min = index * 10;
    const max = min + 9;
    return { bucket: `${min}-${max}`, submissions: 0 };
  });
  for (const row of perCategoryScores) {
    const index = Math.min(9, Math.floor((row._id ?? 0) / 10));
    scoreDistribution[index].submissions += row.count;
  }

  return {
    window: { days, from: since, to: new Date() },
    categoryBreakdown,
    hardestChallenges: hardest,
    scoreDistribution,
    streakDistribution: streakBuckets.map((row) => ({ streak: row._id, users: row.users })),
    levelDistribution: xpBuckets.map((row) => ({ level: (row._id ?? 0) + 1, users: row.users })),
    attemptsDistribution: attemptsDistribution.map((row) => ({ attempt: row._id, submissions: row.count })),
    topPerformers: topPerformers.map((user) => ({
      id: String(user._id),
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      xp: user.xp,
      level: user.level,
      challengesSolved: user.challengesSolved,
      currentStreak: user.currentStreak,
      perfectScores: user.perfectScores,
    })),
    activity: activity.map((row) => ({
      date: row._id,
      submissions: row.submissions,
      xp: row.xp,
      averageScore: row.averageScore ? Math.round(row.averageScore) : 0,
      activeUsers: row.activeUsers?.length ?? 0,
    })),
    generatedAt: new Date(),
  };
}

/** Paginated user management list. */
export async function listUsers({ query = {} } = {}) {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '20', 10) || 20));
  const filter = {};
  if (query.role && query.role !== 'all') filter.role = query.role;
  if (query.search) {
    const term = String(query.search).trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { username: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
    ];
  }

  const sortMap = {
    xp: { xp: -1 },
    recent: { createdAt: -1 },
    active: { lastActiveAt: -1 },
    name: { username: 1 },
  };
  const sort = sortMap[query.sort] ?? { xp: -1 };

  const [items, total] = await Promise.all([
    User.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const submissionStats = items.length
    ? await Submission.aggregate([
        { $match: { userId: { $in: items.map((user) => user._id) } } },
        { $group: { _id: '$userId', submissions: { $sum: 1 }, averageScore: { $avg: '$score' }, lastSubmittedAt: { $max: '$submittedAt' } } },
      ])
    : [];
  const statsMap = new Map(submissionStats.map((row) => [String(row._id), row]));

  return {
    items: items.map((user) => {
      const stats = statsMap.get(String(user._id));
      return {
        id: String(user._id),
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        xp: user.xp,
        level: user.level,
        challengesSolved: user.challengesSolved,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        perfectScores: user.perfectScores,
        submissions: stats?.submissions ?? user.submissionsCount ?? 0,
        averageScore: stats?.averageScore ? Math.round(stats.averageScore * 10) / 10 : 0,
        lastSubmittedAt: stats?.lastSubmittedAt ?? null,
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt,
      };
    }),
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1, hasNextPage: page * limit < total, hasPrevPage: page > 1 },
  };
}

/** Admin edit of a user: role and profile moderation. */
export async function updateUser(userId, payload = {}) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (payload.role !== undefined) {
    if (!['user', 'admin'].includes(payload.role)) throw ApiError.unprocessable('Role must be "user" or "admin"');
    user.role = payload.role;
  }
  if (payload.name !== undefined) user.name = String(payload.name).slice(0, 80);
  if (payload.bio !== undefined) user.bio = String(payload.bio).slice(0, 280);
  await user.save();
  return user;
}

/** Admin submission monitoring list. */
export async function listSubmissions({ query = {} } = {}) {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '20', 10) || 20));
  const filter = {};
  if (query.userId) filter.userId = query.userId;
  if (query.challengeId) filter.challengeId = query.challengeId;
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.minScore || query.maxScore) {
    filter.score = {};
    if (query.minScore) filter.score.$gte = Number(query.minScore);
    if (query.maxScore) filter.score.$lte = Number(query.maxScore);
  }

  const [items, total] = await Promise.all([
    Submission.find(filter).sort({ submittedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Submission.countDocuments(filter),
  ]);

  const { byId } = await getChallengeMeta();
  const users = await User.find({ _id: { $in: items.map((submission) => submission.userId) } }, 'name username avatar').lean();
  const userMap = new Map(users.map((user) => [String(user._id), user]));

  return {
    items: items.map((submission) => {
      const challenge = byId.get(String(submission.challengeId));
      const owner = userMap.get(String(submission.userId));
      return {
        ...serializeSubmission(submission, challenge),
        timeTakenLabel: formatDuration(submission.timeTaken),
        user: owner ? { id: String(owner._id), name: owner.name, username: owner.username, avatar: owner.avatar } : null,
        verification: submission.verification,
      };
    }),
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1, hasNextPage: page * limit < total, hasPrevPage: page > 1 },
  };
}

export default { getDashboardStats, getTeamStatistics, listUsers, updateUser, listSubmissions };
