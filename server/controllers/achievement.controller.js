import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/cookies.js';
import Achievement from '../models/Achievement.js';
import { achievementOverview } from '../services/achievement.service.js';
import { getUserStats } from '../services/user.service.js';

/** GET /api/achievements — catalogue with the signed-in user's progress. */
export const getAchievements = asyncHandler(async (req, res) => {
  if (!req.user) {
    const catalogue = await Achievement.find({ hidden: false }).sort({ order: 1 }).lean();
    return sendSuccess(
      res,
      {
        items: catalogue.map((achievement) => ({ ...achievement, id: String(achievement._id), earned: false, earnedAt: null, progress: { value: 0, threshold: achievement.criteria?.threshold ?? 1, percent: 0, earned: false, remaining: achievement.criteria?.threshold ?? 1 } })),
        summary: { total: catalogue.length, earned: 0, locked: catalogue.length, completionPercent: 0, xpFromAchievements: 0 },
      },
      { message: 'Sign in to track your achievement progress' },
    );
  }

  const stats = await getUserStats(req.user, { includeRecent: false });
  const overview = await achievementOverview(req.user, {
    categoryTotals: stats.categoryProgress.reduce((acc, entry) => {
      acc[entry.category] = entry.total;
      return acc;
    }, {}),
  });
  return sendSuccess(res, overview);
});

export default { getAchievements };
