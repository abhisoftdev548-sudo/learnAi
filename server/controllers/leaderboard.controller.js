import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/cookies.js';
import { getLeaderboard, getLeaderboardPreview } from '../services/leaderboard.service.js';
import { LEADERBOARD_PERIODS } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

/** GET /api/leaderboard?period=weekly|monthly|all-time&limit= */
export const getLeaderboardController = asyncHandler(async (req, res) => {
  const period = String(req.query.period ?? 'all-time');
  if (!LEADERBOARD_PERIODS.includes(period)) {
    throw ApiError.badRequest(`period must be one of: ${LEADERBOARD_PERIODS.join(', ')}`);
  }
  const limit = Math.min(100, Math.max(3, Number.parseInt(req.query.limit ?? '25', 10) || 25));
  const leaderboard = await getLeaderboard({ period, limit, currentUserId: req.user?._id ?? null });
  return sendSuccess(res, leaderboard.entries, { meta: { ...leaderboard, entries: undefined } });
});

/** GET /api/leaderboard/preview — public teaser for the landing page. */
export const getPreview = asyncHandler(async (_req, res) => {
  const preview = await getLeaderboardPreview(5);
  return sendSuccess(res, preview);
});

/** GET /api/leaderboard/config — supported periods (used by the UI). */
export const getConfig = asyncHandler(async (_req, res) => {
  return sendSuccess(res, { periods: LEADERBOARD_PERIODS, defaultPeriod: 'all-time', maxLimit: 100, cacheTtlMs: env.sandboxTicketTtlMs });
});

export default { getLeaderboardController, getPreview, getConfig };
