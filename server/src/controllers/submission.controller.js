'use strict';
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');
const { SubmissionReview } = require('../models/Submission');
const Post = require('../models/community').Post;
const User = require('../models/User');
const { notify } = require('../models/notification.helper');
const { recalcUserScore } = require('../services/leaderboard.service');
const { ApiError, asyncHandler, ok } = require('../utils/errors');
const { validate, required, isUrl, oneOf, gte, lte, maxLength, custom } = require('../utils/validate');
const { REVIEW_STATUSES } = require('../models/Submission');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const URL_RX = /^https?:\/\/\S+$/i;

function assertAnswerValue(ans, reqDef) {
  const value = String(ans.value || '').trim();
  if (reqDef.required && !value) {
    throw ApiError.badRequest(`"${reqDef.label}" is required`, 'MISSING_REQUIRED_FIELD');
  }
  if (!value) return;

  const max = reqDef.max_length || (reqDef.type === 'text' ? 2000 : 500);
  if (value.length > max) {
    throw ApiError.badRequest(`"${reqDef.label}" exceeds ${max} characters`, 'FIELD_TOO_LONG');
  }

  const needUrl = (hostRx, msg) => {
    if (!URL_RX.test(value) && !value.startsWith('/uploads/')) throw ApiError.badRequest(msg, 'INVALID_URL');
    if (hostRx && URL_RX.test(value)) {
      let host = '';
      try { host = new URL(value).hostname.replace(/^www\./, ''); } catch { /* handled above */ }
      if (!hostRx.test(host)) throw ApiError.badRequest(msg, 'INVALID_URL_HOST');
    }
  };

  switch (reqDef.type) {
    case 'github':
      return needUrl(/(^|\.)github\.com$/, `"${reqDef.label}" must be a GitHub repository URL (https://github.com/...)`);
    case 'linkedin':
      return needUrl(/(^|\.)linkedin\.com$/, `"${reqDef.label}" must be a LinkedIn URL (https://www.linkedin.com/...)`);
    case 'drive':
      return needUrl(/(^\.)(drive\.google\.com|docs\.google\.com)$|drive\.google\.com|docs\.google\.com/,
        `"${reqDef.label}" must be a Google Drive/Docs URL`);
    case 'liveUrl':
    case 'file':
    case 'image':
      return needUrl(null, `"${reqDef.label}" must be a valid http(s) URL or an uploaded file`);
    case 'text':
      if (!value) throw ApiError.badRequest(`"${reqDef.label}" is required`, 'MISSING_REQUIRED_FIELD');
      return;
    default:
      throw ApiError.badRequest(`Unknown requirement type ${reqDef.type}`);
  }
}

async function latestAttempt(challengeId, memberId) {
  return Submission.findOne({ challenge: challengeId, member: memberId }).sort({ attempt: -1 });
}

function challengeOpenForSubmission(challenge, now) {
  if (challenge.status !== 'published') {
    return { ok: false, code: 'CHALLENGE_NOT_OPEN', message: 'This challenge is not accepting submissions.' };
  }
  if (now < challenge.startAt) {
    return { ok: false, code: 'NOT_STARTED', message: 'This challenge has not started yet.' };
  }
  if (now > challenge.deadline && !challenge.allowLateSubmissions) {
    return { ok: false, code: 'DEADLINE_PASSED', message: 'The deadline has passed and late submissions are disabled.' };
  }
  return { ok: true };
}

function serializeSubmission(s, { challenge } = {}) {
  return {
    id: s._id,
    challenge: s.challenge,
    member: s.member,
    attempt: s.attempt,
    answers: s.answers,
    status: s.status,
    submittedAt: s.submittedAt,
    isOnTime: s.isOnTime,
    score: s.score,
    feedback: s.feedback,
    reviewedBy: s.reviewedBy,
    reviewedAt: s.reviewedAt,
    resubmissionRequested: s.resubmissionRequested,
    createdAt: s.createdAt,
    maxPoints: challenge ? challenge.maxPoints : undefined,
  };
}

// ---------------------------------------------------------------------------
// Member: submit work
// ---------------------------------------------------------------------------

/**
 * POST /api/submissions/challenges/:id
 * Body: { answers: [{ key, value }] }  (key must match a challenge requirement)
 */
const createSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid challenge id');

  const challenge = await Challenge.findById(id);
  if (!challenge) throw ApiError.notFound('Challenge not found');

  const now = new Date();
  const open = challengeOpenForSubmission(challenge, now);
  if (!open.ok) throw new ApiError(open.code === 'DEADLINE_PASSED' ? 409 : 400, open.message, open.code);

  const body = req.body || {};
  const answersIn = Array.isArray(body.answers) ? body.answers : null;
  if (!answersIn) throw ApiError.badRequest('answers array is required', 'VALIDATION_ERROR');

  const requirements = challenge.requirements || [];
  if (!requirements.length) {
    throw ApiError.badRequest('This challenge has no configured submission requirements');
  }

  const byKey = new Map();
  for (const a of answersIn) {
    if (!a || typeof a.key !== 'string') throw ApiError.badRequest('each answer needs a key');
    byKey.set(a.key, a);
  }

  const answers = [];
  for (const reqDef of requirements) {
    const given = byKey.get(reqDef.key);
    if (!given) {
      if (reqDef.required) {
        throw ApiError.badRequest(`"${reqDef.label}" is required`, 'MISSING_REQUIRED_FIELD');
      }
      continue;
    }
    assertAnswerValue(given, reqDef);
    answers.push({
      key: reqDef.key,
      type: reqDef.type,
      value: String(given.value || '').trim(),
      fileName: String(given.fileName || ''),
      fileUrl: String(given.fileUrl || ''),
    });
  }

  const prev = await latestAttempt(id, req.user._id);
  if (prev) {
    const pending = ['submitted', 'under_review'].includes(prev.status);
    if (pending) {
      throw ApiError.conflict('You already submitted this challenge — it is awaiting review.', 'DUPLICATE_SUBMISSION');
    }
    const needsChanges = prev.status === 'needs_changes';
    const resubmittable = needsChanges || challenge.allowResubmission;
    if (!resubmittable) {
      throw ApiError.conflict(
        prev.status === 'approved'
          ? 'Your submission is already approved and resubmissions are disabled.'
          : 'Resubmissions are not allowed for this challenge.',
        'RESUBMISSION_NOT_ALLOWED'
      );
    }
  }

  const submission = await Submission.create({
    challenge: challenge._id,
    member: req.user._id,
    attempt: prev ? prev.attempt + 1 : 1,
    answers,
    status: 'submitted',
    submittedAt: now,
    isOnTime: now <= challenge.deadline,
    previousSubmission: prev ? prev._id : null,
    resubmissionRequested: false,
  });

  // Notify admins that a review is waiting.
  const admins = await User.find({ role: 'admin', status: 'approved' }).select('_id');
  await notify(admins.map((a) => a._id), 'general',
    'New submission to review',
    `${req.user.name} submitted "${challenge.title}" (attempt ${submission.attempt}).`,
    `/admin/submissions?challenge=${challenge._id}`);

  return ok(res, { submission: serializeSubmission(submission, { challenge }) }, 201);
});

/** GET /api/submissions/challenges/:id/mine — my attempts + latest content */
const mySubmissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid challenge id');
  const challenge = await Challenge.findById(id).select('title requirements maxPoints status deadline allowLateSubmissions startAt');
  if (!challenge) throw ApiError.notFound('Challenge not found');

  const mine = await Submission.find({ challenge: id, member: req.user._id }).sort({ attempt: -1 });
  return ok(res, {
    challenge: {
      id: challenge._id,
      title: challenge.title,
      requirements: challenge.requirements,
      maxPoints: challenge.maxPoints,
      status: challenge.status,
      deadline: challenge.deadline,
      startAt: challenge.startAt,
      allowLateSubmissions: challenge.allowLateSubmissions,
    },
    latest: mine[0] ? serializeSubmission(mine[0], { challenge }) : null,
    history: mine.map((s) => serializeSubmission(s, { challenge })),
  });
});

// ---------------------------------------------------------------------------
// Admin: list + review
// ---------------------------------------------------------------------------

/**
 * GET /api/submissions?status=&challenge=&member=&page=
 * Admin review queue.
 */
const listSubmissions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.challenge && mongoose.isValidObjectId(req.query.challenge)) filter.challenge = req.query.challenge;
  if (req.query.member && mongoose.isValidObjectId(req.query.member)) filter.member = req.query.member;
  if (req.query.onTime === '1') filter.isOnTime = true;
  if (req.query.onTime === '0') filter.isOnTime = false;

  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10) || 20));

  const [total, items] = await Promise.all([
    Submission.countDocuments(filter),
    Submission.find(filter)
      .populate('member', 'name username photoUrl email')
      .populate('challenge', 'title maxPoints deadline status category')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return ok(res, { items, total, page, pages: Math.ceil(total / limit) || 1 });
});

/** GET /api/submissions/:id — admin or the owning member */
const getSubmission = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid submission id');
  const s = await Submission.findById(req.params.id)
    .populate('member', 'name username photoUrl email')
    .populate('challenge')
    .populate('reviewedBy', 'name username');
  if (!s) throw ApiError.notFound('Submission not found');

  const isOwner = String(s.member?._id || s.member) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw ApiError.forbidden('You cannot view this submission', 'FORBIDDEN');
  }

  const reviews = await SubmissionReview.find({ submission: s._id })
    .populate('reviewer', 'name username photoUrl')
    .sort({ revision: -1 })
    .lean();

  return ok(res, {
    submission: serializeSubmission(s, { challenge: s.challenge }),
    challenge: s.challenge ? { id: s.challenge._id, title: s.challenge.title, maxPoints: s.challenge.maxPoints, deadline: s.challenge.deadline } : null,
    member: s.member,
    reviews: reviews.map((r) => ({
      id: r._id,
      revision: r.revision,
      isLatest: r.isLatest,
      pointsAwarded: r.pointsAwarded,
      feedback: r.feedback,
      status: r.status,
      reviewer: r.reviewer,
      createdAt: r.createdAt,
    })),
  });
});

/**
 * POST /api/submissions/:id/review (admin)
 * Body: { points, feedback, status }
 *  - points validated 0..challenge.maxPoints
 *  - previous review becomes history (isLatest=false) — points are only ever
 *    summed over the single latest approved review, so scores can't double-count
 *  - the member's total + leaderboard are recomputed synchronously
 */
const reviewSubmission = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid submission id');
  const body = req.body || {};
  validate(body, {
    points: [required('Points are required'), gte(0, 'Points must be >= 0')],
    status: [required('Status is required'), oneOf(['approved', 'needs_changes', 'rejected', 'under_review'])],
    feedback: [maxLength(3000)],
  });

  const submission = await Submission.findById(req.params.id).populate('challenge');
  if (!submission) throw ApiError.notFound('Submission not found');
  const challenge = submission.challenge;
  if (!challenge) throw ApiError.notFound('Challenge for this submission no longer exists');

  const points = Number(body.points);
  if (!Number.isFinite(points) || points < 0 || points > challenge.maxPoints) {
    throw ApiError.badRequest(
      `Points must be between 0 and ${challenge.maxPoints} (the challenge maximum)`,
      'POINTS_OUT_OF_RANGE'
    );
  }

  const previous = await SubmissionReview.findOne({ submission: submission._id, isLatest: true });

  // Supersede the previous review (kept as history — never deleted).
  if (previous) {
    previous.isLatest = false;
    await previous.save();
  }

  const review = await SubmissionReview.create({
    submission: submission._id,
    challenge: challenge._id,
    member: submission.member,
    reviewer: req.user._id,
    pointsAwarded: body.status === 'approved' ? points : 0,
    feedback: (body.feedback || '').trim(),
    status: body.status,
    isLatest: true,
    previousPoints: previous ? previous.pointsAwarded : null,
    revision: previous ? previous.revision + 1 : 1,
  });

  // Refresh the submission's denormalized review snapshot.
  submission.status = body.status;
  submission.score = body.status === 'approved' ? points : null;
  submission.feedback = review.feedback;
  submission.reviewedBy = req.user._id;
  submission.reviewedAt = new Date();
  submission.resubmissionRequested = body.status === 'needs_changes';
  await submission.save();

  // Recompute member score + leaderboard data from authoritative records.
  const score = await recalcUserScore(submission.member);

  // Notify the member.
  const titleMap = {
    approved: `Submission approved: ${challenge.title}`,
    needs_changes: `Changes requested: ${challenge.title}`,
    rejected: `Submission rejected: ${challenge.title}`,
    under_review: `Submission under review: ${challenge.title}`,
  };
  const typeMap = {
    approved: 'points_awarded',
    needs_changes: 'submission_needs_changes',
    rejected: 'submission_rejected',
    under_review: 'submission_reviewed',
  };
  await notify(
    submission.member,
    typeMap[body.status],
    titleMap[body.status],
    body.status === 'approved'
      ? `You earned ${points} points (total: ${score.points}).`
      : (review.feedback || 'The admin left a note on your submission.'),
    `/challenges/${challenge._id}`
  );

  // Auto-publish to the community feed per the challenge's visibility rule.
  let publishedPost = null;
  if (body.status === 'approved' && challenge.communityVisibility === 'auto') {
    const exists = await Post.findOne({ submission: submission._id, status: 'visible' });
    if (!exists) {
      const member = await User.findById(submission.member).select('name').lean();
      const link = submission.answers.find((a) => ['github', 'liveUrl', 'linkedin'].includes(a.type));
      publishedPost = await Post.create({
        author: submission.member,
        title: `${challenge.title} — completed by ${member ? member.name : 'a teammate'}`,
        body: review.feedback
          ? `${review.feedback}`
          : `Completed the "${challenge.title}" challenge and earned ${points} points!`,
        kind: 'submission',
        challenge: challenge._id,
        submission: submission._id,
        links: link
          ? [{ label: link.type === 'github' ? 'GitHub' : link.type === 'liveUrl' ? 'Live project' : 'LinkedIn', url: link.value }]
          : [],
        fromSubmission: true,
      });
    }
  }

  return ok(res, {
    submission: serializeSubmission(submission, { challenge }),
    review: {
      id: review._id,
      revision: review.revision,
      pointsAwarded: review.pointsAwarded,
      feedback: review.feedback,
      status: review.status,
      createdAt: review.createdAt,
    },
    memberScore: score,
    publishedPost: publishedPost ? { id: publishedPost._id } : null,
  });
});

/** GET /api/submissions/challenges/:id/queue — admin review queue for one challenge */
const challengeQueue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid challenge id');
  const items = await Submission.find({ challenge: id })
    .populate('member', 'name username photoUrl email')
    .sort({ submittedAt: -1 })
    .lean();
  return ok(res, { items: items.map((s) => serializeSubmission(s, {})) });
});

module.exports = {
  createSubmission,
  mySubmissions,
  listSubmissions,
  getSubmission,
  reviewSubmission,
  challengeQueue,
};
