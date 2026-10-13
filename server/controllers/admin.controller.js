import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/cookies.js';
import { getDashboardStats, getTeamStatistics, listSubmissions, listUsers, updateUser } from '../services/admin.service.js';
import { databaseState } from '../config/db.js';
import { listExecutionProviders } from '../services/execution/index.js';

/** GET /api/admin/stats */
export const getStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStats({ activeDays: Number(req.query.activeDays ?? 7) });
  return sendSuccess(res, stats);
});

/** GET /api/admin/statistics */
export const getStatistics = asyncHandler(async (req, res) => {
  const statistics = await getTeamStatistics({ days: Math.min(365, Number(req.query.days ?? 30)) });
  return sendSuccess(res, statistics);
});

/** GET /api/admin/users */
export const getUsers = asyncHandler(async (req, res) => {
  const { items, meta } = await listUsers({ query: req.query });
  return sendSuccess(res, items, { meta });
});

/** PATCH /api/admin/users/:id */
export const patchUser = asyncHandler(async (req, res) => {
  const user = await updateUser(req.params.id, req.body ?? {});
  return sendSuccess(res, user.toPublicJSON(), { message: 'User updated' });
});

/** GET /api/admin/submissions */
export const getSubmissions = asyncHandler(async (req, res) => {
  const { items, meta } = await listSubmissions({ query: req.query });
  return sendSuccess(res, items, { meta });
});

/** GET /api/admin/system — environment/health snapshot for the admin panel. */
export const getSystem = asyncHandler(async (_req, res) => {
  return sendSuccess(res, {
    database: databaseState(),
    execution: { providers: listExecutionProviders() },
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    timestamp: new Date(),
  });
});

export default { getStats, getStatistics, getUsers, patchUser, getSubmissions, getSystem };
