import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/cookies.js';
import {
  getPublicProfile,
  getRecommendedChallenge,
  getUserStats,
  updateProfile,
} from '../services/user.service.js';
import { achievementOverview } from '../services/achievement.service.js';
import { getActivityCalendar, listSubmissions } from '../services/submission.service.js';
import { getProgressMap } from '../services/challenge.service.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { getChallengeMeta } from '../services/challenge.service.js';

/** GET /api/users/me — private profile with full stats. */
export const getMe = asyncHandler(async (req, res) => {
  const stats = await getUserStats(req.user);
  return sendSuccess(res, {
    user: req.user.toPrivateJSON(),
    stats,
    recommendedChallenge: await getRecommendedChallenge(req.user),
  });
});

/** PUT /api/users/me — profile + preferences. */
export const putMe = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.user, req.body ?? {});
  return sendSuccess(res, { user: user.toPrivateJSON() }, { message: 'Profile updated' });
});

/** GET /api/users/me/stats — statistics for the dashboard. */
export const getMyStats = asyncHandler(async (req, res) => {
  const stats = await getUserStats(req.user);
  return sendSuccess(res, { ...stats, recommendedChallenge: await getRecommendedChallenge(req.user) });
});

/** GET /api/users/me/achievements */
export const getMyAchievements = asyncHandler(async (req, res) => {
  const stats = await getUserStats(req.user, { includeRecent: false });
  const overview = await achievementOverview(req.user, {
    categoryTotals: stats.categoryProgress.reduce((acc, entry) => {
      acc[entry.category] = entry.total;
      return acc;
    }, {}),
  });
  return sendSuccess(res, overview);
});

/** GET /api/users/me/submissions — alias of /api/submissions/me. */
export const getMySubmissions = asyncHandler(async (req, res) => {
  const { items, meta } = await listSubmissions({ userId: req.user._id, query: req.query });
  return sendSuccess(res, items, { meta });
});

/** GET /api/users/me/progress — per-challenge progress map. */
export const getMyProgress = asyncHandler(async (req, res) => {
  const { challenges } = await getChallengeMeta();
  const progressMap = await getProgressMap(req.user, challenges.map((challenge) => challenge._id));
  const progress = challenges.map((challenge) => ({
    challengeId: String(challenge._id),
    title: challenge.title,
    slug: challenge.slug,
    category: challenge.category,
    difficulty: challenge.difficulty,
    progress: progressMap.get(String(challenge._id)) ?? null,
  }));
  return sendSuccess(res, progress);
});

/** GET /api/users/me/activity?days= — practice calendar. */
export const getMyActivity = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, Number.parseInt(req.query.days ?? '182', 10) || 182));
  const activity = await getActivityCalendar({ userId: req.user._id, days });
  return sendSuccess(res, activity);
});

/** GET /api/users/:username — public profile. */
export const getUserProfile = asyncHandler(async (req, res) => {
  const profile = await getPublicProfile({ username: req.params.username, viewer: req.user ?? null });
  return sendSuccess(res, profile);
});

/** GET /api/users/me/history — paginated history with pagination meta. */
export const getMyHistory = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 10 });
  const { items, meta } = await listSubmissions({ userId: req.user._id, query: { ...req.query, page, limit } });
  return sendSuccess(res, items, { meta: { ...meta, ...buildMeta({ page, limit, total: meta.total }) } });
});

export default {
  getMe,
  putMe,
  getMyStats,
  getMyAchievements,
  getMySubmissions,
  getMyProgress,
  getMyActivity,
  getMyHistory,
  getUserProfile,
};
