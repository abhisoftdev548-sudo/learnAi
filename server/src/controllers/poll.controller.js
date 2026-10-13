'use strict';
const mongoose = require('mongoose');
const Poll = require('../models/Poll');
const Vote = require('../models/Poll').Vote;
const { notifyAllApproved } = require('../models/notification.helper');
const { ApiError, asyncHandler, ok } = require('../utils/errors');
const { validate, required, minLength, maxLength, isDate, custom, isArray } = require('../utils/validate');

function validatePollBody(body, { partial = false } = {}) {
  validate(body, {
    question: partial ? [minLength(3), maxLength(300)] : [required('Question is required'), minLength(3), maxLength(300)],
    description: [maxLength(1000)],
    image: [custom((v) => (v === undefined || /^https?:\/\//.test(String(v)) ? null : 'image must be a Cloudinary URL or another valid URL'))],
    startsAt: partial ? [isDate()] : [required('Start time is required'), isDate()],
    endsAt: partial ? [isDate()] : [required('End time is required'), isDate()],
    options: [isArray('options must be a list')],
    anonymous: [custom((v) => (v === undefined || typeof v === 'boolean' ? null : 'must be true or false'))],
    allowMultiple: [custom((v) => (v === undefined || typeof v === 'boolean' ? null : 'must be true or false'))],
    allowChangeVote: [custom((v) => (v === undefined || typeof v === 'boolean' ? null : 'must be true or false'))],
    visibility: [custom((v) => (v === undefined || ['team', 'admins'].includes(v) ? null : 'must be team or admins'))],
    resultsVisibility: [custom((v) => (v === undefined || ['immediate', 'after_close'].includes(v) ? null : 'invalid'))],
    status: [custom((v) => (v === undefined || ['draft', 'active', 'closed', 'archived'].includes(v) ? null : 'invalid'))],
  });

  if (body.options !== undefined) {
    if (!Array.isArray(body.options)) throw ApiError.badRequest('options must be a list');
    if (body.options.length < 2 || body.options.length > 10) {
      throw ApiError.badRequest('A poll needs 2-10 options', 'VALIDATION_ERROR');
    }
    const texts = body.options.map((o) => String(typeof o === 'string' ? o : o?.text || '').trim());
    if (texts.some((t) => !t)) throw ApiError.badRequest('Every option needs text');
    if (new Set(texts.map((t) => t.toLowerCase())).size !== texts.length) {
      throw ApiError.badRequest('Options must be unique');
    }
    if (texts.some((t) => t.length > 200)) throw ApiError.badRequest('Options must be at most 200 characters');
  }

  if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) {
    throw ApiError.badRequest('End time must be after start time', 'INVALID_TIME_RANGE');
  }
}

/** Poll results — counts only; voter identities are never exposed to members. */
async function computeResults(poll, { includeVoters = false } = {}) {
  const match = { poll: poll._id };
  const votes = await Vote.find(match).lean();

  const counts = new Map(poll.options.map((o) => [String(o._id), 0]));
  let totalVotes = 0;
  for (const v of votes) {
    totalVotes += 1;
    for (const oid of v.optionIds) {
      const k = String(oid);
      if (counts.has(k)) counts.set(k, counts.get(k) + 1);
    }
  }

  const options = poll.options.map((o) => ({
    id: o._id,
    text: o.text,
    votes: counts.get(String(o._id)) || 0,
    percent: totalVotes
      ? Math.round(((counts.get(String(o._id)) || 0) / totalVotes) * 100)
      : 0,
    voters: undefined,
  }));

  if (includeVoters && !poll.anonymous) {
    const ids = votes.map((v) => v.voter);
    const User = require('../models/User');
    const users = await User.find({ _id: { $in: ids } }).select('name username photoUrl').lean();
    const map = new Map(users.map((u) => [String(u._id), u]));
    for (const o of options) {
      o.voters = votes
        .filter((v) => v.optionIds.some((x) => String(x) === String(o.id)))
        .map((v) => map.get(String(v.voter)))
        .filter(Boolean)
        .map((u) => ({ id: u._id, name: u.name, username: u.username, photoUrl: u.photoUrl }));
    }
  }

  return { options, totalVotes };
}

function liveStatus(p, now = new Date()) {
  if (p.status === 'draft' || p.status === 'archived') return p.status;
  if (p.status === 'closed') return 'closed';
  if (now < new Date(p.startsAt)) return 'scheduled';
  if (now > new Date(p.endsAt)) return 'closed';
  return 'active';
}

function serializePoll(poll, { mine = null, isAdmin = false, results = null, liveStatus: liveOverride } = {}) {
  const status = liveOverride || liveStatus(poll);
  const resultsAllowed =
    (poll.resultsVisibility === 'immediate' && status !== 'draft') ||
    (poll.resultsVisibility === 'after_close' && (status === 'closed' || status === 'archived' || isAdmin));
  return {
    id: poll._id,
    question: poll.question,
    description: poll.description,
    image: poll.image,
    options: poll.options.map((o) => ({ id: o._id, text: o.text })),
    startsAt: poll.startsAt.toISOString(),
    endsAt: poll.endsAt.toISOString(),
    anonymous: poll.anonymous,
    allowMultiple: poll.allowMultiple,
    allowChangeVote: poll.allowChangeVote,
    visibility: poll.visibility,
    resultsVisibility: poll.resultsVisibility,
    status: poll.status,
    liveStatus: status,
    myVote: mine ? mine.optionIds.map(String) : null,
    hasVoted: !!mine,
    results: resultsAllowed ? results : null,
    createdBy: poll.createdBy && (poll.createdBy._id ? { id: poll.createdBy._id, name: poll.createdBy.name } : poll.createdBy),
    createdAt: poll.createdAt,
  };
}

/** GET /api/polls — active & recent polls for members (admins see drafts too) */
const listPolls = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const now = new Date();
  const filter = isAdmin
    ? (req.query.all === '1' ? {} : { status: { $in: ['active', 'closed'] } })
    : { status: { $in: ['active', 'closed'] }, visibility: 'team' };

  const [polls, mine] = await Promise.all([
    Poll.find(filter).populate('createdBy', 'name username').sort({ endsAt: -1, createdAt: -1 }).limit(100).lean(),
    Vote.find({ voter: req.user._id }).lean(),
  ]);
  const mineMap = new Map(mine.map((v) => [String(v.poll), v]));

  const items = [];
  for (const p of polls) {
    const live = liveStatus(p, now);
    if (live === 'closed' && !isAdmin && p.status !== 'closed') {
      // fall through — still show recently closed polls
    }
    const includeVoters = isAdmin;
    const status = live;
    const showResults =
      (p.resultsVisibility === 'immediate' && status !== 'draft') ||
      (p.resultsVisibility === 'after_close' && (status === 'closed' || status === 'archived')) ||
      isAdmin;
    const results = showResults ? await computeResults(p, { includeVoters }) : null;
    items.push(serializePoll(p, { mine: mineMap.get(String(p._id)) || null, isAdmin, results, liveStatus: live }));
  }

  return ok(res, { items });
});

/** GET /api/polls/:id */
const getPoll = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid poll id');
  const isAdmin = req.user.role === 'admin';
  const p = await Poll.findById(req.params.id).populate('createdBy', 'name username').lean();
  if (!p) throw ApiError.notFound('Poll not found');
  if (p.status === 'draft' && !isAdmin) throw ApiError.notFound('Poll not found');
  if (p.visibility === 'admins' && !isAdmin) throw ApiError.forbidden('This poll is admin-only');

  const [mine, vote] = await Promise.all([
    Vote.findOne({ poll: p._id, voter: req.user._id }).lean(),
    null,
  ]);
  const live = liveStatus(p, new Date());
  const showResults =
    (p.resultsVisibility === 'immediate' && live !== 'draft') ||
    (p.resultsVisibility === 'after_close' && (live === 'closed' || live === 'archived')) ||
    isAdmin;
  const results = showResults ? await computeResults(p, { includeVoters: isAdmin }) : null;
  return ok(res, { poll: serializePoll(p, { mine, isAdmin, results, liveStatus: live }) });
});

/** POST /api/polls (admin) */
const createPoll = asyncHandler(async (req, res) => {
  validatePollBody(req.body);
  const b = req.body;
  const poll = await Poll.create({
    question: b.question.trim(),
    description: b.description || '',
    image: b.image || '',
    options: b.options.map((o) => ({ text: String(typeof o === 'string' ? o : o.text).trim() })),
    startsAt: new Date(b.startsAt),
    endsAt: new Date(b.endsAt),
    anonymous: !!b.anonymous,
    allowMultiple: !!b.allowMultiple,
    allowChangeVote: !!b.allowChangeVote,
    visibility: b.visibility || 'team',
    resultsVisibility: b.resultsVisibility || 'immediate',
    status: b.status || 'draft',
    createdBy: req.user._id,
  });

  if (poll.status === 'active') {
    await notifyAllApproved('poll_opened', `Poll opened: ${poll.question}`,
      'Cast your vote before it closes.', `/polls/${poll._id}`);
  }
  return ok(res, { poll: serializePoll(poll, { isAdmin: true }) }, 201);
});

/** PATCH /api/polls/:id (admin) */
const updatePoll = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid poll id');
  const poll = await Poll.findById(req.params.id);
  if (!poll) throw ApiError.notFound('Poll not found');
  const body = { ...req.body };
  delete body.status;
  validatePollBody({ ...poll.toObject(), ...body }, { partial: true });

  if (body.question !== undefined) poll.question = String(body.question).trim();
  if (body.description !== undefined) poll.description = body.description;
  if (body.image !== undefined) poll.image = body.image;
  if (body.startsAt !== undefined) poll.startsAt = new Date(body.startsAt);
  if (body.endsAt !== undefined) poll.endsAt = new Date(body.endsAt);
  if (body.anonymous !== undefined) poll.anonymous = !!body.anonymous;
  if (body.allowMultiple !== undefined) poll.allowMultiple = !!body.allowMultiple;
  if (body.allowChangeVote !== undefined) poll.allowChangeVote = !!body.allowChangeVote;
  if (body.visibility !== undefined) poll.visibility = body.visibility;
  if (body.resultsVisibility !== undefined) poll.resultsVisibility = body.resultsVisibility;

  if (body.options !== undefined) {
    const texts = body.options.map((o) => String(typeof o === 'string' ? o : o.text).trim());
    // Keep existing option ids when the text is unchanged so votes stay valid.
    const newOptions = texts.map((t) => {
      const existing = poll.options.find((o) => o.text === t);
      return existing ? { _id: existing._id, text: t } : { text: t };
    });
    const removed = poll.options.filter((o) => !texts.includes(o.text));
    if (removed.length) {
      const removedIds = removed.map((o) => String(o._id));
      await Vote.updateMany(
        { poll: poll._id },
        { $pull: { optionIds: { $in: removed.map((o) => o._id) } } }
      );
      await Vote.deleteMany({ poll: poll._id, optionIds: { $size: 0 } });
      void removedIds;
    }
    poll.options = newOptions;
  }

  await poll.save();
  return ok(res, { poll: serializePoll(poll, { isAdmin: true }) });
});

/** POST /api/polls/:id/status (admin) — active | closed | archived | draft */
const setPollStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid poll id');
  const { status } = req.body || {};
  if (!['draft', 'active', 'closed', 'archived'].includes(status)) throw ApiError.badRequest('Invalid status');
  const poll = await Poll.findById(req.params.id);
  if (!poll) throw ApiError.notFound('Poll not found');
  const wasActive = poll.status === 'active';
  poll.status = status;
  if (status === 'active' && new Date() > poll.endsAt) {
    throw ApiError.badRequest('Cannot activate a poll whose end time has passed — extend it first', 'POLL_EXPIRED');
  }
  await poll.save();

  if (status === 'active' && !wasActive) {
    await notifyAllApproved('poll_opened', `Poll opened: ${poll.question}`, 'Cast your vote before it closes.', `/polls/${poll._id}`);
  }
  if (status === 'closed' && wasActive) {
    await notifyAllApproved('poll_closed', `Poll closed: ${poll.question}`, 'Results are in.', `/polls/${poll._id}`);
  }
  return ok(res, { poll: serializePoll(poll, { isAdmin: true }) });
});

/** DELETE /api/polls/:id (admin) — only draft polls can be deleted outright */
const deletePoll = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid poll id');
  const poll = await Poll.findById(req.params.id);
  if (!poll) throw ApiError.notFound('Poll not found');
  if (poll.status !== 'draft') {
    throw ApiError.conflict('Only draft polls can be deleted — close or archive this one instead', 'NOT_DELETABLE');
  }
  await Vote.deleteMany({ poll: poll._id });
  await poll.deleteOne();
  return ok(res, { message: 'Poll deleted' });
});

/** POST /api/polls/:id/vote  { optionIds: [...] } */
const vote = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid poll id');
  const poll = await Poll.findById(req.params.id);
  if (!poll) throw ApiError.notFound('Poll not found');
  if (poll.status === 'draft' || poll.visibility === 'admins' && req.user.role !== 'admin') {
    throw ApiError.notFound('Poll not found');
  }

  const now = new Date();
  if (poll.status !== 'active' || now < poll.startsAt || now > poll.endsAt) {
    throw ApiError.conflict('This poll is not open for voting', 'POLL_CLOSED');
  }

  const { optionIds } = req.body || {};
  if (!Array.isArray(optionIds) || optionIds.length === 0) {
    throw ApiError.badRequest('Select at least one option', 'VALIDATION_ERROR');
  }
  const validIds = new Set(poll.options.map((o) => String(o._id)));
  const normalized = [...new Set(optionIds.map(String))];
  if (normalized.some((id) => !validIds.has(id))) {
    throw ApiError.badRequest('One or more options are invalid');
  }
  if (!poll.allowMultiple && normalized.length > 1) {
    throw ApiError.badRequest('This poll accepts a single choice', 'SINGLE_CHOICE_ONLY');
  }

  const existing = await Vote.findOne({ poll: poll._id, voter: req.user._id });
  if (existing && !poll.allowChangeVote) {
    // DB-level unique index also guarantees this — defense in depth.
    throw ApiError.conflict('You have already voted in this poll', 'ALREADY_VOTED');
  }

  let voteDoc;
  if (existing && poll.allowChangeVote) {
    existing.optionIds = normalized;
    existing.changedAt = new Date();
    await existing.save();
    voteDoc = existing;
  } else {
    try {
      voteDoc = await Vote.create({ poll: poll._id, voter: req.user._id, optionIds: normalized });
    } catch (e) {
      if (e.code === 11000) throw ApiError.conflict('You have already voted in this poll', 'ALREADY_VOTED');
      throw e;
    }
  }

  const showResults =
    (poll.resultsVisibility === 'immediate' && liveStatus(poll, now) !== 'draft') ||
    (poll.resultsVisibility === 'after_close' && liveStatus(poll, now) === 'closed') ||
    req.user.role === 'admin';
  const results = showResults ? await computeResults(poll, { includeVoters: req.user.role === 'admin' }) : null;

  return ok(res, {
    voted: normalized,
    results,
    changed: !!existing,
    voteId: voteDoc._id,
  });
});

/** GET /api/polls/:id/voters (admin, non-anonymous polls) */
const listVoters = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid poll id');
  const poll = await Poll.findById(req.params.id);
  if (!poll) throw ApiError.notFound('Poll not found');
  if (poll.anonymous) throw ApiError.forbidden('This poll is anonymous', 'ANONYMOUS_POLL');
  const votes = await Vote.find({ poll: poll._id }).populate('voter', 'name username photoUrl').lean();
  return ok(res, {
    items: votes.map((v) => ({
      voter: v.voter,
      optionIds: v.optionIds.map(String),
      changedAt: v.changedAt,
      votedAt: v.createdAt,
    })),
    total: votes.length,
  });
});

module.exports = {
  listPolls,
  getPoll,
  createPoll,
  updatePoll,
  setPollStatus,
  deletePoll,
  vote,
  listVoters,
  computeResults,
  serializePoll,
  liveStatus,
};
