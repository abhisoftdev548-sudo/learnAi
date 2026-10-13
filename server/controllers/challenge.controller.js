import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/cookies.js';
import {
  createChallenge,
  deleteChallenge,
  getChallengeByIdOrSlug,
  listChallenges,
  updateChallenge,
} from '../services/challenge.service.js';
import { signSandboxTicket } from '../utils/jwt.js';
import { listExecutionProviders } from '../services/execution/index.js';
import env from '../config/env.js';

/** GET /api/challenges — filters: category, difficulty, status, search, sort. */
export const getChallenges = asyncHandler(async (req, res) => {
  const { items, meta } = await listChallenges({
    user: req.user,
    query: {
      ...req.query,
      includeUnpublished: req.user?.role === 'admin' && req.query.includeUnpublished === 'true',
    },
  });
  return sendSuccess(res, items, { meta });
});

/** GET /api/challenges/:id — id or slug. */
export const getChallenge = asyncHandler(async (req, res) => {
  const { challenge, attempts, progress, bestScore, solved } = await getChallengeByIdOrSlug(req.params.id, {
    user: req.user,
    includeUnpublished: req.user?.role === 'admin',
  });

  const payload = {
    ...challenge.toDetailJSON(),
    attempts,
    progress,
    bestScore,
    solved,
    sandbox: {
      providers: listExecutionProviders(),
      ticketTtlMs: env.sandboxTicketTtlMs,
    },
  };

  const hasMeasurements = payload.runtimeSpec.measurements.length > 0;
  if (req.user && hasMeasurements) {
    payload.sandbox.ticket = signSandboxTicket({ userId: req.user._id, challengeId: challenge._id, version: challenge.updatedAt?.getTime() ?? 1 });
  }
  return sendSuccess(res, payload);
});

/** POST /api/challenges (admin) */
export const postChallenge = asyncHandler(async (req, res) => {
  const challenge = await createChallenge(req.body, req.user._id);
  return sendSuccess(res, challenge.toAdminJSON(), { status: 201, message: 'Challenge created' });
});

/** PUT /api/challenges/:id (admin) */
export const putChallenge = asyncHandler(async (req, res) => {
  const challenge = await updateChallenge(req.params.id, req.body);
  return sendSuccess(res, challenge.toAdminJSON(), { message: 'Challenge updated' });
});

/** DELETE /api/challenges/:id (admin) */
export const removeChallenge = asyncHandler(async (req, res) => {
  const force = req.query.force === 'true' || req.query.force === '1';
  const result = await deleteChallenge(req.params.id, { force });
  return sendSuccess(res, result, { message: `Challenge deleted (${result.removedSubmissions} submissions removed)` });
});

export default { getChallenges, getChallenge, postChallenge, putChallenge, removeChallenge };
