import { User, Challenge, Submission, Team } from '../models/index.js';
import { ApiError } from '../utils/http.js';
export async function dashboard() {
  const since = new Date(Date.now() - 30 * 86400000);
  const [totalUsers, active, totalChallenges, totals, popular] = await Promise.all([
    User.countDocuments(),
    Submission.aggregate([{ $match: { submittedAt: { $gte: since } } }, { $group: { _id: '$userId' } }, { $count: 'count' }]),
    Challenge.countDocuments({ deletedAt: null }),
    Submission.aggregate([{ $group: { _id: null, total: { $sum: 1 }, averageScore: { $avg: '$score' } } }]),
    Submission.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 1 }]),
  ]);
  return { totalUsers, activeUsers: active[0]?.count || 0, activeWindowDays: 30, totalChallenges, totalSubmissions: totals[0]?.total || 0, averageScore: totals[0]?.averageScore || 0, mostPopularCategory: popular[0]?._id || null };
}
export async function users({ page, limit }) {
  const [items, total] = await Promise.all([User.find().select('name username role xp level challengesSolved teamId createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), User.countDocuments()]);
  return { items, total, page, limit };
}
export async function submissions({ page, limit }) {
  const [items, total] = await Promise.all([Submission.find().populate('userId', 'username').populate('challengeId', 'title category').sort({ submittedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Submission.countDocuments()]);
  return { items, total, page, limit };
}
export async function teamStats({ page, limit }) {
  const [items, total] = await Promise.all([Team.aggregate([
    { $sort: { name: 1, _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit },
    { $lookup: { from: 'users', let: { team: '$_id' }, pipeline: [
      { $match: { $expr: { $eq: ['$teamId', '$$team'] } } },
      { $group: { _id: null, members: { $sum: 1 }, xp: { $sum: '$xp' }, challengesSolved: { $sum: '$challengesSolved' }, totalScore: { $sum: '$totalScore' }, submissions: { $sum: '$submissionCount' } } },
    ], as: 'stats' } },
    { $set: { stats: { $ifNull: [{ $arrayElemAt: ['$stats', 0] }, { members: 0, xp: 0, challengesSolved: 0, totalScore: 0, submissions: 0 }] } } },
    { $set: { 'stats.averageScore': { $cond: [{ $gt: ['$stats.submissions', 0] }, { $divide: ['$stats.totalScore', '$stats.submissions'] }, 0] } } },
  ]), Team.countDocuments()]);
  return { items, total, page, limit };
}
export async function assignTeam(userId, teamId) {
  if (teamId && !(await Team.exists({ _id: teamId }))) throw new ApiError(404, 'Team not found');
  const user = await User.findByIdAndUpdate(userId, { teamId }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  return { userId: user._id, teamId: user.teamId };
}

export async function createTeam(data, userId) { return Team.create({ ...data, createdBy: userId }); }
export async function myTeam(teamId) { return teamId ? Team.findById(teamId) : null; }
