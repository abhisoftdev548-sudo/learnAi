import { User } from '../models/index.js';
export function periodStart(period, now = new Date()) {
  if (period === 'all-time') return null;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), period === 'monthly' ? 1 : now.getUTCDate()));
  if (period === 'weekly') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  return start;
}
export async function leaderboard(userId, { period, page, limit }) {
  const start = periodStart(period);
  const pipeline = start ? [
    { $lookup: { from: 'submissions', let: { user: '$_id' }, pipeline: [
      { $match: { submittedAt: { $gte: start }, $expr: { $eq: ['$userId', '$$user'] } } },
      { $group: { _id: null, xp: { $sum: '$xpEarned' }, challengesSolved: { $sum: { $cond: ['$firstSolve', 1, 0] } }, averageScore: { $avg: '$score' } } },
    ], as: 'periodStats' } },
    { $set: { xp: { $ifNull: [{ $arrayElemAt: ['$periodStats.xp', 0] }, 0] }, challengesSolved: { $ifNull: [{ $arrayElemAt: ['$periodStats.challengesSolved', 0] }, 0] }, averageScore: { $ifNull: [{ $arrayElemAt: ['$periodStats.averageScore', 0] }, 0] } } },
  ] : [{ $set: { averageScore: { $cond: [{ $gt: ['$submissionCount', 0] }, { $divide: ['$totalScore', '$submissionCount'] }, 0] } } }];
  pipeline.push(
    { $set: { currentStreak: { $cond: [{ $gte: ['$lastPracticeDate', new Date(Math.floor(Date.now() / 86400000) * 86400000 - 86400000)] }, '$currentStreak', 0] } } },
    { $project: { currentStreak: 1, username: 1, name: 1, avatar: 1, xp: 1, challengesSolved: 1, averageScore: 1 } },
    // MongoDB rank window functions accept one sort field. An ordered BSON
    // object preserves the lexicographic metric order and stable ID tie-break.
    { $set: { rankingKey: { xp: { $multiply: ['$xp', -1] }, solved: { $multiply: ['$challengesSolved', -1] }, average: { $multiply: ['$averageScore', -1] }, id: '$_id' } } },
    { $setWindowFields: { sortBy: { rankingKey: 1 }, output: { rank: { $documentNumber: {} } } } },
    { $unset: 'rankingKey' },
    { $sort: { rank: 1 } },
    { $facet: { items: [{ $skip: (page - 1) * limit }, { $limit: limit }], me: [{ $match: { _id: userId } }], total: [{ $count: 'count' }] } },
  );
  const [result] = await User.aggregate(pipeline).option({ maxTimeMS: 10000, allowDiskUse: true });
  return { items: result.items, me: result.me[0] || null, total: result.total[0]?.count || 0, period, startsAt: start, page, limit };
}
