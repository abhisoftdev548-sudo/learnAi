import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/cookies.js';
import ApiError from '../utils/ApiError.js';
import { getSubmission, listSubmissions, submitSolution } from '../services/submission.service.js';
import { requireOwnerOrAdmin } from '../middleware/auth.js';

const MAX_BODY_BYTES = 200 * 1024;

/** POST /api/submissions — the main practice flow. */
export const createSubmission = asyncHandler(async (req, res) => {
  const challengeId = req.body?.challengeId ?? req.body?.challenge;
  if (!challengeId) throw ApiError.unprocessable('challengeId is required', [{ field: 'challengeId', message: 'required' }]);
  if (!/^[a-f\d]{24}$/i.test(String(challengeId))) {
    throw ApiError.badRequest('challengeId must be a valid challenge id');
  }
  if (JSON.stringify(req.body).length > MAX_BODY_BYTES) {
    throw new ApiError(413, 'Submission payload is too large', { code: 'PAYLOAD_TOO_LARGE' });
  }

  const result = await submitSolution({
    user: req.user,
    challengeId,
    payload: {
      htmlCode: req.body.htmlCode ?? '',
      cssCode: req.body.cssCode ?? '',
      jsCode: req.body.jsCode ?? '',
      timeTaken: req.body.timeTaken ?? 0,
      observations: req.body.observations ?? null,
      sandboxTicket: req.body.sandboxTicket ?? null,
    },
  });

  return sendSuccess(res, result, {
    status: 201,
    message: result.result.passed ? `Challenge passed with ${result.result.score}/100` : `Scored ${result.result.score}/100`,
  });
});

/** GET /api/submissions/me */
export const getMySubmissions = asyncHandler(async (req, res) => {
  const { items, meta } = await listSubmissions({ userId: req.user._id, query: req.query });
  return sendSuccess(res, items, { meta });
});

/** GET /api/submissions/:id (owner or admin) */
export const getSubmissionById = asyncHandler(async (req, res) => {
  const submission = await getSubmission({ submissionId: req.params.id, viewer: req.user });
  return sendSuccess(res, submission);
});

export { requireOwnerOrAdmin };
export default { createSubmission, getMySubmissions, getSubmissionById };
