import Challenge from '../models/Challenge.js';
import Submission from '../models/Submission.js';
import ApiError from '../utils/ApiError.js';
import { CATEGORIES, DIFFICULTIES, TEST_CASE_TYPES, XP_BY_DIFFICULTY } from '../config/constants.js';
import { buildRegExp, escapeRegExp } from './analysis/jsAnalyzer.js';
import { slugify } from '../utils/slugify.js';

const META_CACHE_TTL_MS = 30 * 1000;
let metaCache = { at: 0, value: null };

/** Lightweight challenge metadata (category/difficulty/xp) with a short TTL cache. */
export async function getChallengeMeta({ force = false } = {}) {
  if (!force && metaCache.value && Date.now() - metaCache.at < META_CACHE_TTL_MS) return metaCache.value;
  const challenges = await Challenge.find({}, 'title slug category difficulty xp passingScore maxAttempts isPublished order').lean();
  const byId = new Map(challenges.map((challenge) => [String(challenge._id), challenge]));
  const totalsByCategory = CATEGORIES.reduce((acc, category) => {
    acc[category] = challenges.filter((challenge) => challenge.category === category && challenge.isPublished).length;
    return acc;
  }, {});
  const value = { challenges, byId, totalsByCategory };
  metaCache = { at: Date.now(), value };
  return value;
}

export function invalidateChallengeMeta() {
  metaCache = { at: 0, value: null };
}

/**
 * List challenges with the caller's progress attached.
 * Supports search, category, difficulty and status (solved/unsolved) filters.
 */
export async function listChallenges({ user = null, query = {} } = {}) {
  const filter = {};
  if (!query.includeUnpublished) filter.isPublished = true;
  if (query.category && query.category !== 'all') filter.category = query.category;
  if (query.difficulty && query.difficulty !== 'all') filter.difficulty = query.difficulty;
  if (query.search) {
    const term = String(query.search).trim();
    filter.$or = [
      { title: { $regex: escapeRegExp(term), $options: 'i' } },
      { description: { $regex: escapeRegExp(term), $options: 'i' } },
      { tags: { $regex: escapeRegExp(term), $options: 'i' } },
    ];
  }

  const sort = query.sort === 'difficulty'
    ? { difficulty: 1, order: 1 }
    : query.sort === 'newest'
      ? { createdAt: -1 }
      : { order: 1, createdAt: 1 };

  const challenges = await Challenge.find(filter).sort(sort).lean();
  const progressMap = user ? await getProgressMap(user, challenges.map((challenge) => challenge._id)) : new Map();

  let items = challenges.map((challenge) => ({
    ...serializeSummary(challenge),
    progress: progressMap.get(String(challenge._id)) ?? null,
  }));

  if (query.status === 'solved') items = items.filter((item) => item.progress?.solved);
  if (query.status === 'unsolved') items = items.filter((item) => !item.progress?.solved);
  if (query.status === 'in-progress') items = items.filter((item) => item.progress?.attemptsUsed > 0 && !item.progress?.solved);

  const facets = {
    categories: CATEGORIES.map((category) => ({
      category,
      total: challenges.filter((challenge) => challenge.category === category).length,
      solved: items.filter((item) => item.category === category && item.progress?.solved).length,
    })),
    difficulties: DIFFICULTIES.map((difficulty) => ({
      difficulty,
      total: challenges.filter((challenge) => challenge.difficulty === difficulty).length,
      solved: items.filter((item) => item.difficulty === difficulty && item.progress?.solved).length,
    })),
  };

  return { items, meta: { total: items.length, facets } };
}

function serializeSummary(challenge) {
  const id = String(challenge._id);
  return {
    id,
    title: challenge.title,
    slug: challenge.slug,
    description: challenge.description,
    category: challenge.category,
    difficulty: challenge.difficulty,
    xp: challenge.xp,
    timeLimit: challenge.timeLimit,
    maxAttempts: challenge.maxAttempts,
    passingScore: challenge.passingScore,
    hintsCount: challenge.hints?.length ?? 0,
    tags: challenge.tags ?? [],
    order: challenge.order ?? 0,
    isPublished: challenge.isPublished !== false,
    testCount: challenge.testCases?.length ?? 0,
    createdAt: challenge.createdAt,
    updatedAt: challenge.updatedAt,
  };
}

/** Attempt/best-score/solved progress for the given challenge ids. */
export async function getProgressMap(user, challengeIds) {
  if (!user || !challengeIds.length) return new Map();
  const submissions = await Submission.find({ userId: user._id, challengeId: { $in: challengeIds } }, 'challengeId score status attemptNumber submittedAt').lean();
  const map = new Map();
  for (const submission of submissions) {
    const key = String(submission.challengeId);
    const current = map.get(key) ?? { attemptsUsed: 0, bestScore: 0, solved: false, lastSubmittedAt: null, bestStatus: null, attemptNumbers: [] };
    current.attemptsUsed += 1;
    current.attemptNumbers.push(submission.attemptNumber);
    if (submission.score > current.bestScore) {
      current.bestScore = submission.score;
      current.bestStatus = submission.status;
    }
    if (submission.status === 'passed') current.solved = true;
    if (!current.lastSubmittedAt || new Date(submission.submittedAt) > new Date(current.lastSubmittedAt)) {
      current.lastSubmittedAt = submission.submittedAt;
    }
    map.set(key, current);
  }
  for (const entry of user.solvedChallenges ?? []) {
    const key = String(entry.challenge);
    const current = map.get(key) ?? { attemptsUsed: 0, bestScore: 0, solved: false, lastSubmittedAt: null, bestStatus: null, attemptNumbers: [] };
    current.solved = true;
    if (entry.score > current.bestScore) current.bestScore = entry.score;
    map.set(key, current);
  }
  return map;
}

export async function getChallengeByIdOrSlug(idOrSlug, { user = null, includeUnpublished = false } = {}) {
  const isObjectId = /^[a-f\d]{24}$/i.test(String(idOrSlug));
  const challenge = await Challenge.findOne(isObjectId ? { _id: idOrSlug } : { slug: String(idOrSlug).toLowerCase() });
  if (!challenge) throw ApiError.notFound('Challenge not found');
  if (!challenge.isPublished && !includeUnpublished) throw ApiError.notFound('Challenge not found');

  const progress = user ? (await getProgressMap(user, [challenge._id])).get(String(challenge._id)) ?? null : null;
  const attemptsUsed = progress?.attemptsUsed ?? 0;

  return {
    challenge,
    progress,
    attempts: {
      used: attemptsUsed,
      max: challenge.maxAttempts,
      remaining: Math.max(0, challenge.maxAttempts - attemptsUsed),
      exhausted: attemptsUsed >= challenge.maxAttempts,
      label: `Attempts: ${attemptsUsed} / ${challenge.maxAttempts}`,
    },
    bestScore: progress?.bestScore ?? 0,
    solved: Boolean(progress?.solved),
  };
}

/* ------------------------------------------------------------------ *
 * Admin CRUD
 * ------------------------------------------------------------------ */

export async function createChallenge(payload, adminId) {
  const data = normalizeChallengePayload(payload, { partial: false });
  data.slug = await ensureUniqueSlug(data.slug || slugify(data.title));
  if (!data.order) {
    const last = await Challenge.findOne({}, 'order').sort({ order: -1 }).lean();
    data.order = (last?.order ?? 0) + 1;
  }
  const challenge = await Challenge.create({ ...data, createdBy: adminId });
  invalidateChallengeMeta();
  return challenge;
}

export async function updateChallenge(id, payload) {
  const challenge = await Challenge.findById(id);
  if (!challenge) throw ApiError.notFound('Challenge not found');

  const data = normalizeChallengePayload(payload, { partial: true, existing: challenge });
  if (data.slug && data.slug !== challenge.slug) {
    data.slug = await ensureUniqueSlug(data.slug, challenge._id);
  }
  Object.assign(challenge, data);
  await challenge.save();
  invalidateChallengeMeta();
  return challenge;
}

/**
 * Delete a challenge.
 *
 * Submissions are the audit trail of a user's XP, so a challenge that has been
 * attempted is protected: the admin has to explicitly force the deletion, and
 * doing so rewinds the XP those submissions granted (achievements stay earned —
 * they are historical).
 */
export async function deleteChallenge(id, { force = false } = {}) {
  const challenge = await Challenge.findById(id);
  if (!challenge) throw ApiError.notFound('Challenge not found');

  const submissionCount = await Submission.countDocuments({ challengeId: challenge._id });
  if (submissionCount > 0 && !force) {
    throw ApiError.conflict(
      `"${challenge.title}" has ${submissionCount} submission(s). Unpublish it instead, or repeat the request with ?force=true to delete it and rewind the awarded XP.`,
      { submissions: submissionCount, challengeId: String(challenge._id) },
      'CHALLENGE_HAS_SUBMISSIONS',
    );
  }

  let affectedUsers = 0;
  if (submissionCount > 0) {
    const submissions = await Submission.find({ challengeId: challenge._id }, 'userId xpEarned').lean();
    const userIds = [...new Set(submissions.map((submission) => String(submission.userId)))];
    await Submission.deleteMany({ challengeId: challenge._id });
    affectedUsers = await rewindChallengeProgress({ challenge, userIds });
  }

  await challenge.deleteOne();
  invalidateChallengeMeta();
  return {
    challenge: serializeSummary(challenge),
    removedSubmissions: submissionCount,
    affectedUsers,
  };
}

/** Rebuild XP / solved aggregates for users whose submissions were just removed. */
async function rewindChallengeProgress({ challenge, userIds }) {
  const User = (await import('../models/User.js')).default;
  const { levelFromXp } = await import('./xp.service.js');
  let updated = 0;

  for (const userId of userIds) {
    // eslint-disable-next-line no-await-in-loop
    const user = await User.findById(userId);
    if (!user) continue;

    const solvedIndex = user.solvedChallenges.findIndex((entry) => String(entry.challenge) === String(challenge._id));
    if (solvedIndex >= 0) user.solvedChallenges.splice(solvedIndex, 1);

    // eslint-disable-next-line no-await-in-loop
    const remaining = await Submission.find({ userId: user._id }, 'xpEarned').lean();
    const submissionXp = remaining.reduce((sum, submission) => sum + (submission.xpEarned ?? 0), 0);
    user.xp = Math.max(0, submissionXp + (user.achievementXp ?? 0));
    user.level = levelFromXp(user.xp);
    user.submissionsCount = remaining.length;
    user.recalculateTotals();
    // eslint-disable-next-line no-await-in-loop
    await user.save();
    updated += 1;
  }

  return updated;
}

async function ensureUniqueSlug(base, excludeId = null) {
  const root = slugify(base) || 'challenge';
  let candidate = root;
  let counter = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Challenge.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    candidate = `${root}-${counter}`;
    counter += 1;
  }
  return candidate;
}

const MAX_TEXT = { title: 120, description: 600, code: 60000 };

function assertString(value, field, { required = false, max = MAX_TEXT.description } = {}) {
  if (value === undefined || value === null) {
    if (required) throw ApiError.unprocessable(`"${field}" is required`, [{ field, message: 'required' }]);
    return undefined;
  }
  if (typeof value !== 'string') throw ApiError.unprocessable(`"${field}" must be a string`, [{ field, message: 'must be a string' }]);
  if (value.length > max) throw ApiError.unprocessable(`"${field}" exceeds ${max} characters`, [{ field, message: 'too long' }]);
  return value;
}

function assertNumber(value, field, { min, max, fallback, integer = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (fallback === undefined) throw ApiError.unprocessable(`"${field}" is required`, [{ field, message: 'required' }]);
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw ApiError.unprocessable(`"${field}" must be a number`, [{ field, message: 'must be a number' }]);
  if (integer && !Number.isInteger(parsed)) throw ApiError.unprocessable(`"${field}" must be an integer`, [{ field, message: 'must be an integer' }]);
  if (min !== undefined && parsed < min) throw ApiError.unprocessable(`"${field}" must be >= ${min}`, [{ field, message: `min ${min}` }]);
  if (max !== undefined && parsed > max) throw ApiError.unprocessable(`"${field}" must be <= ${max}`, [{ field, message: `max ${max}` }]);
  return parsed;
}

function assertEnum(value, field, allowed, fallback) {
  if (value === undefined || value === null || value === '') {
    if (fallback === undefined) throw ApiError.unprocessable(`"${field}" is required`, [{ field, message: 'required' }]);
    return fallback;
  }
  if (!allowed.includes(value)) throw ApiError.unprocessable(`"${field}" must be one of: ${allowed.join(', ')}`, [{ field, message: 'invalid value' }]);
  return value;
}

/** Validate + normalize an admin challenge payload. */
export function normalizeChallengePayload(payload = {}, { partial = false, existing = null } = {}) {
  const data = {};

  const title = assertString(payload.title, 'title', { required: !partial, max: MAX_TEXT.title });
  if (title !== undefined) data.title = title.trim();

  const description = assertString(payload.description, 'description', { required: !partial });
  if (description !== undefined) data.description = description.trim();

  if (payload.category !== undefined || !partial) {
    data.category = assertEnum(payload.category ?? existing?.category, 'category', CATEGORIES);
  }
  if (payload.difficulty !== undefined || !partial) {
    data.difficulty = assertEnum(payload.difficulty ?? existing?.difficulty, 'difficulty', DIFFICULTIES);
  }

  if (payload.instructions !== undefined || !partial) {
    const instructions = payload.instructions ?? [];
    if (!Array.isArray(instructions) || instructions.length === 0) {
      throw ApiError.unprocessable('"instructions" must contain at least one requirement', [{ field: 'instructions', message: 'required' }]);
    }
    data.instructions = instructions.map((entry, index) => {
      const text = assertString(String(entry ?? ''), `instructions[${index}]`, { required: true, max: 400 });
      if (!text.trim()) throw ApiError.unprocessable(`"instructions[${index}]" cannot be empty`, [{ field: `instructions[${index}]` }]);
      return text.trim();
    });
  }

  for (const field of ['starterHTML', 'starterCSS', 'starterJS']) {
    const value = assertString(payload[field], field, { max: MAX_TEXT.code, required: false });
    if (value !== undefined) data[field] = value;
  }

  if (payload.hints !== undefined) {
    if (!Array.isArray(payload.hints)) throw ApiError.unprocessable('"hints" must be an array', [{ field: 'hints' }]);
    data.hints = payload.hints.map((hint, index) => assertString(String(hint ?? ''), `hints[${index}]`, { max: 400 }).trim()).filter(Boolean);
  }

  if (payload.tags !== undefined) {
    if (!Array.isArray(payload.tags)) throw ApiError.unprocessable('"tags" must be an array', [{ field: 'tags' }]);
    data.tags = payload.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean).slice(0, 12);
  }

  if (payload.maxAttempts !== undefined) data.maxAttempts = assertNumber(payload.maxAttempts, 'maxAttempts', { min: 1, max: 10 });
  if (payload.timeLimit !== undefined) data.timeLimit = assertNumber(payload.timeLimit, 'timeLimit', { min: 5, max: 240 });
  if (payload.passingScore !== undefined) data.passingScore = assertNumber(payload.passingScore, 'passingScore', { min: 0, max: 100 });
  if (payload.xp !== undefined) {
    data.xp = assertNumber(payload.xp, 'xp', { min: 10, max: 500 });
  } else if (!partial) {
    const difficulty = data.difficulty ?? existing?.difficulty ?? 'Easy';
    data.xp = XP_BY_DIFFICULTY[difficulty] ?? 50;
  }
  if (payload.isPublished !== undefined) data.isPublished = Boolean(payload.isPublished);
  if (payload.order !== undefined) data.order = assertNumber(payload.order, 'order', { min: 0, max: 9999 });
  if (payload.previewLanguage !== undefined) {
    data.previewLanguage = payload.previewLanguage ? assertEnum(payload.previewLanguage, 'previewLanguage', ['html', 'css', 'javascript']) : null;
  }
  if (payload.slug !== undefined) data.slug = slugify(assertString(payload.slug, 'slug', { max: 140 }));

  if (payload.testCases !== undefined || !partial) {
    data.testCases = normalizeTestCases(payload.testCases ?? []);
  }

  return data;
}

export function normalizeTestCases(testCases) {
  if (!Array.isArray(testCases) || testCases.length === 0) {
    throw ApiError.unprocessable('"testCases" must contain at least one test', [{ field: 'testCases', message: 'required' }]);
  }
  const seen = new Set();
  return testCases.map((test, index) => {
    const prefix = `testCases[${index}]`;
    const id = String(test?.id ?? '').trim();
    if (!id) throw ApiError.unprocessable(`"${prefix}.id" is required`, [{ field: `${prefix}.id` }]);
    if (seen.has(id)) throw ApiError.unprocessable(`Duplicate test id "${id}"`, [{ field: `${prefix}.id` }]);
    seen.add(id);

    const name = assertString(test?.name ?? `${id}`, `${prefix}.name`, { max: 160 });
    const group = assertEnum(test?.group, `${prefix}.group`, ['html', 'css', 'functionality', 'responsiveness', 'codeQuality']);
    const type = assertEnum(test?.type, `${prefix}.type`, TEST_CASE_TYPES);
    const kind = type === 'measure' || type === 'viewport' ? 'measure' : 'static';
    const weight = assertNumber(test?.weight ?? 1, `${prefix}.weight`, { min: 0.1, max: 20 }) ?? 1;

    const normalized = {
      id,
      name,
      group,
      type,
      kind,
      weight,
      description: assertString(test?.description, `${prefix}.description`, { max: 300 }) ?? '',
      failureMessage: assertString(test?.failureMessage, `${prefix}.failureMessage`, { max: 300 }) ?? '',
      selector: assertString(test?.selector, `${prefix}.selector`, { max: 300 }) ?? '',
      property: assertString(test?.property, `${prefix}.property`, { max: 60 }) ?? '',
      attribute: assertString(test?.attribute, `${prefix}.attribute`, { max: 60 }) ?? '',
      operator: test?.operator ?? (kind === 'measure' ? 'exists' : 'exists'),
      pattern: assertString(test?.pattern, `${prefix}.pattern`, { max: 400 }) ?? '',
      flags: assertString(test?.flags, `${prefix}.flags`, { max: 10 }) ?? '',
      scope: test?.scope ?? 'code',
      check: assertString(test?.check, `${prefix}.check`, { max: 60 }) ?? '',
      target: test?.target ?? 'auto',
      value: test?.value ?? null,
      count: test?.count ?? null,
      requires: Array.isArray(test?.requires) ? test.requires.map(String) : [],
    };

    if (normalized.pattern) {
      if (!buildRegExp(normalized.pattern, normalized.flags)) {
        throw ApiError.unprocessable(`"${prefix}.pattern" is not a valid regular expression`, [{ field: `${prefix}.pattern` }]);
      }
    }

    if (kind === 'measure') {
      if (!test?.script || typeof test.script !== 'string') {
        throw ApiError.unprocessable(`"${prefix}.script" is required for measured tests`, [{ field: `${prefix}.script` }]);
      }
      normalized.script = test.script.slice(0, 4000);
      normalized.timeoutMs = assertNumber(test?.timeoutMs ?? 3000, `${prefix}.timeoutMs`, { min: 250, max: 10000 }) ?? 3000;
      normalized.viewport = {
        width: test?.viewport?.width ? assertNumber(test.viewport.width, `${prefix}.viewport.width`, { min: 200, max: 3840 }) : null,
        height: test?.viewport?.height ? assertNumber(test.viewport.height, `${prefix}.viewport.height`, { min: 200, max: 2160 }) : null,
      };
      normalized.checks = (test?.checks ?? []).map((check, checkIndex) => {
        const checkPrefix = `${prefix}.checks[${checkIndex}]`;
        const path = assertString(check?.path, `${checkPrefix}.path`, { required: true, max: 120 });
        return {
          path,
          op: assertEnum(check?.op, `${checkPrefix}.op`, ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'not-contains', 'regex', 'in', 'one-of', 'truthy', 'changed-by']),
          value: check?.value ?? null,
          comparePath: assertString(check?.comparePath, `${checkPrefix}.comparePath`, { max: 120 }) ?? '',
          tolerance: check?.tolerance !== undefined ? assertNumber(check.tolerance, `${checkPrefix}.tolerance`, { min: 0, max: 100, integer: false }) : 0,
          message: assertString(check?.message, `${checkPrefix}.message`, { max: 300 }) ?? '',
        };
      });
    }

    return normalized;
  });
}

export default {
  listChallenges,
  getChallengeByIdOrSlug,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  getChallengeMeta,
  getProgressMap,
  invalidateChallengeMeta,
};
