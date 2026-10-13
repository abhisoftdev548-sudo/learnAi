'use strict';
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { notifyAllApproved, notify } = require('../models/notification.helper');
const { ApiError, asyncHandler, ok } = require('../utils/errors');
const {
  validate, required, minLength, maxLength, isUrl, oneOf, isDate,
  gte, lte, isArray, isInt, pattern, custom,
} = require('../utils/validate');
const { CATEGORIES, DIFFICULTIES, SUBMISSION_TYPES } = require('../models/Challenge');

const toIso = (d) => (d ? new Date(d).toISOString() : null);

/** Time phase of a challenge (works on lean objects too). */
function timeState(c, now = new Date()) {
  if (c.status !== 'published') return c.status; // draft | archived
  if (now < new Date(c.startAt)) return 'not_started';
  if (now > new Date(c.deadline)) return c.allowLateSubmissions ? 'active' : 'closed';
  return 'active';
}

function validateChallengeBody(body, { partial = false } = {}) {
  const schema = {
    title: partial ? [minLength(3), maxLength(140)] : [required('Title is required'), minLength(3), maxLength(140)],
    description: partial ? [maxLength(5000)] : [required('Description is required'), maxLength(5000)],
    instructions: [maxLength(8000)],
    category: partial ? [oneOf(CATEGORIES)] : [required('Category is required'), oneOf(CATEGORIES)],
    difficulty: [oneOf(DIFFICULTIES)],
    startAt: partial ? [isDate()] : [required('Start date is required'), isDate()],
    deadline: partial ? [isDate()] : [required('Deadline is required'), isDate()],
    maxPoints: partial
      ? [isInt(), gte(1), lte(1000)]
      : [required('Maximum points are required'), isInt(), gte(1), lte(1000)],
    status: [oneOf(['draft', 'published', 'archived'])],
    requirements: [isArray()],
    referenceLinks: [isArray()],
    coverImage: [custom((v) => (
      v === undefined || v === '' || /^https?:\/\//.test(String(v))
        ? null
        : 'Cover image must be a valid URL'
    ))],
    allowLateSubmissions: [custom((v) => (v === undefined || typeof v === 'boolean' ? null : 'must be true or false'))],
    allowResubmission: [custom((v) => (v === undefined || typeof v === 'boolean' ? null : 'must be true or false'))],
    communityVisibility: [oneOf(['auto', 'private'])],
  };
  validate(body, schema);

  if (body.requirements !== undefined) {
    if (!Array.isArray(body.requirements)) throw ApiError.badRequest('requirements must be a list');
    const seen = new Set();
    body.requirements.forEach((r, i) => {
      if (!r || typeof r !== 'object') throw ApiError.badRequest(`requirements[${i}] is invalid`);
      if (!r.label || typeof r.label !== 'string' || !r.label.trim()) {
        throw ApiError.badRequest(`requirements[${i}].label is required`);
      }
      if (!SUBMISSION_TYPES.includes(r.type)) {
        throw ApiError.badRequest(`requirements[${i}].type must be one of: ${SUBMISSION_TYPES.join(', ')}`);
      }
      const key = `req_${i}`;
      if (seen.has(key)) throw ApiError.badRequest('duplicate requirement');
      seen.add(key);
    });
    if (body.requirements.length > 10) throw ApiError.badRequest('At most 10 requirements');
  }
  if (body.referenceLinks !== undefined) {
    if (!Array.isArray(body.referenceLinks) || body.referenceLinks.length > 10) {
      throw ApiError.badRequest('referenceLinks must be a list of at most 10 URLs');
    }
    body.referenceLinks.forEach((l) => {
      try {
        const u = new URL(String(l));
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
      } catch {
        throw ApiError.badRequest(`Invalid reference link: ${l}`);
      }
    });
  }
  if (body.startAt && body.deadline) {
    const s = new Date(body.startAt);
    const d = new Date(body.deadline);
    if (d.getTime() <= s.getTime()) {
      throw ApiError.badRequest('Deadline must be after the start date', 'INVALID_DEADLINE');
    }
  }
  if (body.startAt && body.deadline === undefined && !partial) {
    throw ApiError.badRequest('Deadline is required');
  }
}

function normalizeRequirements(requirements = []) {
  return requirements.map((r, i) => ({
    key: r.key || `req_${i + 1}`,
    label: String(r.label).trim(),
    type: r.type,
    required: r.required !== false,
    help: String(r.help || '').slice(0, 300),
    max_length: Number(r.max_length) > 0 ? Number(r.max_length) : (r.type === 'text' ? 2000 : 500),
  }));
}

/** Public/admin serializer for a challenge document. */
function serializeChallenge(c, { isAdmin = false, mySubmission = null, now = new Date() } = {}) {
  const phase = timeState(c, now);
  const hasSubmission = !!mySubmission;
  let memberStatus;
  if (mySubmission) {
    memberStatus = mySubmission.status; // submitted | under_review | needs_changes | approved | rejected
  } else if (phase === 'not_started') memberStatus = 'not_started';
  else if (phase === 'closed' || phase === 'draft' || phase === 'archived') memberStatus = 'closed';
  else if (now > c.deadline && !c.allowLateSubmissions) memberStatus = 'overdue';
  else memberStatus = 'active';

  return {
    id: c._id,
    title: c.title,
    description: c.description,
    instructions: c.instructions,
    category: c.category,
    difficulty: c.difficulty,
    startAt: toIso(c.startAt),
    deadline: toIso(c.deadline),
    maxPoints: c.maxPoints,
    requirements: c.requirements,
    referenceLinks: c.referenceLinks,
    coverImage: c.coverImage,
    status: c.status,
    phase,
    allowLateSubmissions: c.allowLateSubmissions,
    allowResubmission: c.allowResubmission,
    communityVisibility: c.communityVisibility,
    createdBy: c.createdBy && (c.createdBy._id ? { id: c.createdBy._id, name: c.createdBy.name, username: c.createdBy.username } : c.createdBy),
    submissionCount: c.submissionCount ?? undefined,
    mySubmission: mySubmission
      ? {
          id: mySubmission._id,
          attempt: mySubmission.attempt,
          status: mySubmission.status,
          score: mySubmission.score,
          feedback: mySubmission.feedback,
          submittedAt: mySubmission.submittedAt,
          isOnTime: mySubmission.isOnTime,
          answers: mySubmission.answers,
        }
      : null,
    memberStatus,
    createdAt: toIso(c.createdAt),
    updatedAt: toIso(c.updatedAt),
    ...(isAdmin ? {} : {}),
  };
}

/** GET /api/challenges — members see published; admins can request ?all=1 */
const listChallenges = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const wantAll = isAdmin && ['1', 'true'].includes(String(req.query.all || ''));
  const now = new Date();

  const filter = {};
  if (!wantAll) {
    filter.status = 'published';
    filter.startAt = { $lte: now };
  } else if (req.query.status) {
    filter.status = String(req.query.status);
  }
  if (req.query.category) filter.category = String(req.query.category);
  if (req.query.difficulty) filter.difficulty = String(req.query.difficulty);
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }
  if (req.query.deadline === 'open') filter.deadline = { $gte: now };
  if (req.query.deadline === 'closed') filter.deadline = { $lt: now };

  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '12', 10) || 12));

  const [total, challenges] = await Promise.all([
    Challenge.countDocuments(filter),
    Challenge.find(filter)
      .populate('createdBy', 'name username')
      .sort({ deadline: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  // Attach submission counts + the caller's own submission state.
  const ids = challenges.map((c) => c._id);
  const [counts, mine] = await Promise.all([
    Submission.aggregate([
      { $match: { challenge: { $in: ids } } },
      { $group: { _id: '$challenge', n: { $sum: 1 } } },
    ]),
    Submission.find({ challenge: { $in: ids }, member: req.user._id })
      .sort({ attempt: -1 })
      .lean(),
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  const mineMap = new Map();
  for (const s of mine) if (!mineMap.has(String(s.challenge))) mineMap.set(String(s.challenge), s);

  const items = challenges.map((c) => {
    const plain = { ...c };
    plain.submissionCount = countMap.get(String(c._id)) || 0;
    return serializeChallenge(plain, {
      isAdmin,
      mySubmission: mineMap.get(String(c._id)) || null,
      now,
    });
  });

  return ok(res, { items, total, page, pages: Math.ceil(total / limit) || 1 });
});

/** GET /api/challenges/:id — full detail incl. member participation state */
const getChallenge = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid challenge id');
  const isAdmin = req.user.role === 'admin';
  const filter = { _id: req.params.id };
  if (!isAdmin) filter.status = 'published';

  const c = await Challenge.findOne(filter).populate('createdBy', 'name username').lean();
  if (!c) throw ApiError.notFound('Challenge not found');

  const now = new Date();
  const [count, mine] = await Promise.all([
    Submission.countDocuments({ challenge: c._id }),
    Submission.find({ challenge: c._id, member: req.user._id }).sort({ attempt: -1 }).lean(),
  ]);
  c.submissionCount = count;
  return ok(res, {
    challenge: serializeChallenge(c, { isAdmin, mySubmission: mine[0] || null, now }),
    history: mine.map((s) => ({
      id: s._id,
      attempt: s.attempt,
      status: s.status,
      score: s.score,
      feedback: s.feedback,
      submittedAt: s.submittedAt,
      isOnTime: s.isOnTime,
    })),
  });
});

/** POST /api/challenges (admin) */
const createChallenge = asyncHandler(async (req, res) => {
  validateChallengeBody(req.body);
  const body = req.body;
  const challenge = await Challenge.create({
    title: body.title.trim(),
    description: body.description,
    instructions: body.instructions || '',
    category: body.category,
    difficulty: body.difficulty || 'medium',
    startAt: new Date(body.startAt),
    deadline: new Date(body.deadline),
    maxPoints: Number(body.maxPoints),
    requirements: normalizeRequirements(body.requirements),
    referenceLinks: body.referenceLinks || [],
    coverImage: body.coverImage || '',
    status: body.status || 'draft',
    allowLateSubmissions: !!body.allowLateSubmissions,
    allowResubmission: !!body.allowResubmission,
    communityVisibility: body.communityVisibility || 'auto',
    createdBy: req.user._id,
  });

  if (challenge.status === 'published') {
    await notifyAllApproved(
      'challenge_published',
      `New challenge: ${challenge.title}`,
      `${challenge.maxPoints} points · due ${challenge.deadline.toLocaleString()}`,
      `/challenges/${challenge._id}`
    );
  }
  return ok(res, { challenge: serializeChallenge(challenge, { isAdmin: true }) }, 201);
});

/** PATCH /api/challenges/:id (admin) */
const updateChallenge = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid challenge id');
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw ApiError.notFound('Challenge not found');

  const body = { ...req.body };
  delete body.status; // status changes go through dedicated endpoints
  validateChallengeBody({ ...challenge.toObject(), ...body }, { partial: true });
  // Re-run date comparison with merged values
  if (body.startAt || body.deadline) {
    const s = new Date(body.startAt || challenge.startAt);
    const d = new Date(body.deadline || challenge.deadline);
    if (d.getTime() <= s.getTime()) {
      throw ApiError.badRequest('Deadline must be after the start date', 'INVALID_DEADLINE');
    }
  }

  const fields = [
    'title', 'description', 'instructions', 'category', 'difficulty', 'maxPoints',
    'coverImage', 'allowLateSubmissions', 'allowResubmission', 'communityVisibility',
  ];
  for (const f of fields) if (body[f] !== undefined) challenge[f] = body[f];
  if (body.startAt !== undefined) challenge.startAt = new Date(body.startAt);
  if (body.deadline !== undefined) challenge.deadline = new Date(body.deadline);
  if (body.requirements !== undefined) challenge.requirements = normalizeRequirements(body.requirements);
  if (body.referenceLinks !== undefined) challenge.referenceLinks = body.referenceLinks;

  await challenge.save();
  return ok(res, { challenge: serializeChallenge(challenge, { isAdmin: true }) });
});

/** POST /api/challenges/:id/status  { status: draft|published|archived } (admin) */
const setChallengeStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid challenge id');
  const { status } = req.body || {};
  if (!['draft', 'published', 'archived'].includes(status)) {
    throw ApiError.badRequest('status must be draft, published or archived');
  }
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw ApiError.notFound('Challenge not found');

  const wasPublished = challenge.status === 'published';
  challenge.status = status;
  await challenge.save();

  if (status === 'published' && !wasPublished) {
    await notifyAllApproved(
      'challenge_published',
      `New challenge: ${challenge.title}`,
      `${challenge.maxPoints} points · due ${challenge.deadline.toLocaleString()}`,
      `/challenges/${challenge._id}`
    );
  }
  return ok(res, { challenge: serializeChallenge(challenge, { isAdmin: true }) });
});

/** DELETE /api/challenges/:id (admin) */
const deleteChallenge = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid challenge id');
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw ApiError.notFound('Challenge not found');
  const isOwner = String(challenge.createdBy) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw ApiError.forbidden('Only the challenge creator or an admin can delete this challenge', 'DELETE_FORBIDDEN');
  }
  const subs = await Submission.countDocuments({ challenge: challenge._id });
  if (subs > 0) {
    throw ApiError.conflict(
      `Cannot delete: ${subs} submission(s) exist. Archive the challenge instead.`,
      'HAS_SUBMISSIONS'
    );
  }
  await challenge.deleteOne();
  return ok(res, { message: 'Challenge deleted' });
});

/**
 * GET /api/challenges/:id/participation (admin)
 * Member-by-member participation report computed from real records + deadline.
 */
const participationReport = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid challenge id');
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw ApiError.notFound('Challenge not found');

  const now = new Date();
  const closedForNew = now > challenge.deadline && !challenge.allowLateSubmissions;

  const [members, subs] = await Promise.all([
    User.find({ status: 'approved', role: { $in: ['member', 'admin'] } })
      .select('name username photoUrl email')
      .sort({ name: 1 })
      .lean(),
    Submission.find({ challenge: challenge._id }).sort({ attempt: -1 }).lean(),
  ]);

  const latest = new Map();
  for (const s of subs) {
    const k = String(s.member);
    if (!latest.has(k)) latest.set(k, s); // sorted by attempt desc
  }

  const rows = members.map((m) => {
    const s = latest.get(String(m._id));
    let status;
    if (s) {
      status = s.status; // submitted | under_review | needs_changes | approved | rejected
    } else if (closedForNew || challenge.status === 'archived') {
      status = 'overdue';
    } else {
      status = 'not_submitted';
    }
    return {
      memberId: m._id,
      name: m.name,
      username: m.username,
      photoUrl: m.photoUrl,
      status,
      attempt: s ? s.attempt : 0,
      submittedAt: s ? s.submittedAt : null,
      isOnTime: s ? s.isOnTime : null,
      score: s ? s.score : null,
      reviewedAt: s ? s.reviewedAt : null,
    };
  });

  const eligible = rows.length;
  const submitted = rows.filter((r) => r.attempt > 0);
  const stats = {
    eligible,
    submittedCount: submitted.length,
    missingCount: eligible - submitted.length,
    submissionPercent: eligible ? Math.round((submitted.length / eligible) * 100) : 0,
    onTime: submitted.filter((r) => r.isOnTime).length,
    late: submitted.filter((r) => r.isOnTime === false).length,
    reviewed: rows.filter((r) => ['approved', 'rejected', 'needs_changes'].includes(r.status)).length,
    pendingReview: rows.filter((r) => ['submitted', 'under_review'].includes(r.status)).length,
    notSubmitted: rows.filter((r) => r.status === 'not_submitted').length,
    overdue: rows.filter((r) => r.status === 'overdue').length,
    approved: rows.filter((r) => r.status === 'approved').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    needsChanges: rows.filter((r) => r.status === 'needs_changes').length,
  };

  return ok(res, { challenge: { id: challenge._id, title: challenge.title, deadline: challenge.deadline, status: challenge.status }, stats, rows });
});

module.exports = {
  listChallenges,
  getChallenge,
  createChallenge,
  updateChallenge,
  setChallengeStatus,
  deleteChallenge,
  participationReport,
  serializeChallenge,
  normalizeRequirements,
  timeState,
};
