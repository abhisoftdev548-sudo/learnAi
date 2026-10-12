import { User, Challenge, UserAchievement, Submission, Achievement } from '../models/index.js';
import { ApiError, publicUser } from '../utils/http.js';
import { currentStreak } from './progressionService.js';
export async function profile(filter, privateProfile = false) {
  const query = User.findOne(filter);
  if (privateProfile) query.select('+email');
  const user = await query;
  if (!user) throw new ApiError(404, 'User not found');
  const [achievements, totals, activity] = await Promise.all([
    UserAchievement.find({ userId: user._id }).populate('achievementId').sort({ earnedAt: -1 }).lean(),
    // Include archived challenges so historical solved progress stays coherent.
    Challenge.aggregate([{ $group: { _id: '$category', total: { $sum: 1 } } }]),
    Submission.aggregate([
      { $match: { userId: user._id, submittedAt: { $gte: new Date(Date.now() - 100 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt', timezone: 'UTC' } }, count: { $sum: 1 }, passed: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const progress = Object.fromEntries(['HTML', 'CSS', 'JavaScript'].map(category => {
    const total = totals.find(t => t._id === category)?.total || 0;
    const solved = user.categorySolved[category];
    return [category, { solved, total, percentage: total ? Math.round(solved / total * 100) : 0 }];
  }));
  const data = publicUser(user);
  return { ...data, activity, currentStreak: currentStreak(user), averageScore: user.submissionCount ? Math.round(user.totalScore / user.submissionCount * 100) / 100 : 0, progress, achievements };
}
export async function updateProfile(id, data) { await User.updateOne({ _id: id }, { $set: data }, { runValidators: true }); return profile({ _id: id }, true); }

export async function achievementDefinitions() { return Achievement.find().sort({ threshold: 1, key: 1 }).lean(); }
