import Challenge from '../models/Challenge.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { CODE_LIMITS } from '../config/constants.js';
import { analyzeSubmission } from './analysis/index.js';
import { scoreSubmission } from './scoring.service.js';
import { resolveMeasurements } from './execution/index.js';
import { calculateXpAward, applyXp, levelProgress } from './xp.service.js';
import { recordPractice } from './streak.service.js';
import { evaluateAchievements } from './achievement.service.js';
import { getChallengeMeta, invalidateChallengeMeta } from './challenge.service.js';
import { verifySandboxTicket } from '../utils/jwt.js';

/**
 * Submission flow (mirrors the platform spec):
 *  1. authenticate       (route middleware)
 *  2. find challenge
 *  3. check attempt limit
 *  4. validate submitted code
 *  5. run tests safely   (server static analysis + sandbox measurements)
 *  6. calculate score
 *  7. save submission
 *  8. update XP / level
 *  9. update streak
 * 10. check achievements
 * 11. return the full result
 */
export async function submitSolution({ user, challengeId, payload }) {
  const { htmlCode = '', cssCode = '', jsCode = '', timeTaken = 0, observations = null, sandboxTicket = null } = payload ?? {};

  // 2. challenge
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) throw ApiError.notFound('Challenge not found');
  if (!challenge.isPublished) throw ApiError.forbidden('This challenge is not available for submissions yet');

  // 4. validate code
  validateCode({ htmlCode, cssCode, jsCode });
  const timeTakenSeconds = Math.max(0, Math.min(24 * 60 * 60, Math.round(Number(timeTaken) || 0)));
  const exceededTimeLimit = timeTakenSeconds > challenge.timeLimit * 60 + 60;

  // 3. attempt limit
  const previousSubmissions = await Submission.find({ userId: user._id, challengeId: challenge._id }, 'score attemptNumber status submittedAt')
    .sort({ attemptNumber: 1 })
    .lean();
  const attemptNumber = previousSubmissions.length + 1;
  if (attemptNumber > challenge.maxAttempts) {
    throw new ApiError(403, `Attempt limit reached (${challenge.maxAttempts}/${challenge.maxAttempts}). Reset is not possible for this challenge.`, {
      code: 'ATTEMPT_LIMIT_REACHED',
      details: { attemptsUsed: previousSubmissions.length, maxAttempts: challenge.maxAttempts },
    });
  }

  // 5. tests — deterministic source analysis on the server
  const analysis = analyzeSubmission({ html: htmlCode, css: cssCode, js: jsCode });
  const hasMeasurements = (challenge.testCases ?? []).some((test) => test.kind === 'measure');
  let measurementResult = { measurements: new Map(), provider: 'none', note: '' };

  if (hasMeasurements) {
    if (sandboxTicket) {
      verifySandboxTicket(sandboxTicket, { userId: user._id, challengeId: challenge._id });
    }
    measurementResult = await resolveMeasurements({
      challenge,
      code: { html: htmlCode, css: cssCode, js: jsCode },
      analysis,
      observations,
      userId: user._id,
    });
  }

  // 6. score
  const scoring = scoreSubmission({
    challenge,
    analysis,
    measurements: measurementResult.measurements,
    providerName: measurementResult.provider ?? 'client-sandbox',
  });

  // 8./9. XP + streak (streak is advanced first so the streak bonus reflects today)
  const previousBest = previousSubmissions.reduce((best, submission) => Math.max(best, submission.score), 0);
  const streakUpdate = recordPractice(user);
  const xpAward = calculateXpAward({
    challengeXp: challenge.xp,
    score: scoring.score,
    previousBestScore: previousBest,
    attemptNumber,
    passingScore: challenge.passingScore,
    currentStreak: streakUpdate.currentStreak,
    exceededTimeLimit,
  });
  const xpResult = applyXp(user, xpAward.totalXp);

  // 7. save submission
  const submission = await Submission.create({
    userId: user._id,
    challengeId: challenge._id,
    htmlCode,
    cssCode,
    jsCode,
    score: scoring.score,
    testsPassed: scoring.testsPassed,
    totalTests: scoring.totalTests,
    attemptNumber,
    timeTaken: timeTakenSeconds,
    status: scoring.status,
    submittedAt: new Date(),
    isPerfect: scoring.isPerfect,
    exceededTimeLimit,
    xpEarned: xpAward.totalXp,
    bonusXp: xpAward.bonusXp,
    baseXp: xpAward.baseXp,
    isBestScore: xpAward.isNewBest,
    improvement: xpAward.improvement,
    categoryScores: scoring.categoryScores,
    testResults: scoring.testResults,
    verification: scoring.verification,
  });

  // Update the user's aggregate statistics.
  user.submissionsCount = (user.submissionsCount ?? 0) + 1;
  user.lastActiveAt = new Date();
  const solvedEntry = user.solvedFor(challenge._id);
  const passed = scoring.status === 'passed';
  if (passed) {
    if (solvedEntry) {
      solvedEntry.score = Math.max(solvedEntry.score ?? 0, scoring.score);
      solvedEntry.attempts = attemptNumber;
    } else {
      user.solvedChallenges.push({
        challenge: challenge._id,
        category: challenge.category,
        difficulty: challenge.difficulty,
        score: scoring.score,
        attempts: attemptNumber,
        firstAttempt: attemptNumber === 1,
        solvedAt: new Date(),
      });
      if (attemptNumber === 1) user.firstAttemptSuccesses = (user.firstAttemptSuccesses ?? 0) + 1;
    }
  }
  user.recalculateTotals();

  // 10. achievements (may award extra XP)
  const { challenges: allChallenges } = await getChallengeMeta({ force: true });
  const categoryTotals = allChallenges.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + (entry.isPublished ? 1 : 0);
    return acc;
  }, {});
  const { newlyEarned } = await evaluateAchievements(user, { categoryTotals, challenge });

  await user.save();
  invalidateChallengeMeta();

  const attempts = {
    used: attemptNumber,
    max: challenge.maxAttempts,
    remaining: Math.max(0, challenge.maxAttempts - attemptNumber),
    exhausted: attemptNumber >= challenge.maxAttempts,
    label: `Attempts: ${attemptNumber} / ${challenge.maxAttempts}`,
  };

  const nextChallenge = await findNextChallenge(challenge, user);

  return {
    submission,
    result: {
      score: scoring.score,
      maxScore: 100,
      testsPassed: scoring.testsPassed,
      totalTests: scoring.totalTests,
      attemptNumber,
      timeTaken: timeTakenSeconds,
      timeTakenLabel: formatDuration(timeTakenSeconds),
      status: scoring.status,
      passed: scoring.status === 'passed',
      passingScore: challenge.passingScore,
      isPerfect: scoring.isPerfect,
      exceededTimeLimit,
      xpEarned: xpAward.totalXp,
      baseXp: xpAward.baseXp,
      bonusXp: xpAward.bonusXp,
      bonuses: xpAward.bonuses,
      improvement: xpAward.improvement,
      isBestScore: xpAward.isNewBest,
      previousBest,
      checklist: {
        html: scoring.categoryScores.html.earned,
        css: scoring.categoryScores.css.earned,
        functionality: scoring.categoryScores.functionality.earned,
        responsiveness: scoring.categoryScores.responsiveness.earned,
        codeQuality: scoring.categoryScores.codeQuality.earned,
      },
    },
    breakdown: {
      groups: scoring.groups,
      categoryScores: scoring.categoryScores,
      testResults: scoring.testResults,
    },
    verification: {
      ...scoring.verification,
      note:
        measurementResult.provider === 'remote-runner'
          ? 'Behaviour measured by the isolated execution service; all points judged on the server.'
          : 'Structure, CSS and code quality verified deterministically on the server; behaviour measured in the sandboxed client preview.',
    },
    user: {
      id: String(user._id),
      xp: user.xp,
      level: user.level,
      levelProgress: levelProgress(user.xp),
      levelUps: xpResult.levelUps,
      totalScore: user.totalScore,
      challengesSolved: user.challengesSolved,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      perfectScores: user.perfectScores,
      practicedToday: true,
      streakBroken: streakUpdate.streakBroken,
    },
    attempts,
    achievements: newlyEarned,
    nextChallenge,
  };
}

function validateCode({ htmlCode, cssCode, jsCode }) {
  const errors = [];
  if (typeof htmlCode !== 'string' || typeof cssCode !== 'string' || typeof jsCode !== 'string') {
    throw ApiError.badRequest('htmlCode, cssCode and jsCode must all be strings');
  }
  if (htmlCode.length > CODE_LIMITS.html) errors.push({ field: 'htmlCode', message: `exceeds ${CODE_LIMITS.html} characters` });
  if (cssCode.length > CODE_LIMITS.css) errors.push({ field: 'cssCode', message: `exceeds ${CODE_LIMITS.css} characters` });
  if (jsCode.length > CODE_LIMITS.js) errors.push({ field: 'jsCode', message: `exceeds ${CODE_LIMITS.js} characters` });
  if (!htmlCode.trim() && !cssCode.trim() && !jsCode.trim()) {
    errors.push({ field: 'code', message: 'nothing to submit — write a solution first' });
  }
  if (errors.length) throw ApiError.unprocessable('Submitted code failed validation', errors);
}

async function findNextChallenge(current, user) {
  const solvedIds = new Set((user.solvedChallenges ?? []).map((entry) => String(entry.challenge)));
  const candidates = await Challenge.find({ isPublished: true, _id: { $ne: current._id } }, 'title slug category difficulty xp order testCases')
    .sort({ order: 1 })
    .lean();
  const unsolved = candidates.filter((challenge) => !solvedIds.has(String(challenge._id)));
  const preferred = unsolved.find((challenge) => challenge.category === current.category) ?? unsolved[0];
  if (!preferred) return null;
  return {
    id: String(preferred._id),
    title: preferred.title,
    slug: preferred.slug,
    category: preferred.category,
    difficulty: preferred.difficulty,
    xp: preferred.xp,
  };
}

export function formatDuration(totalSeconds = 0) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/** Submission history for the signed-in user (optionally filtered). */
export async function listSubmissions({ userId, query = {} }) {
  const filter = { userId };
  if (query.challengeId) filter.challengeId = query.challengeId;
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.category || (query.search ?? '').trim()) {
    const { challenges } = await getChallengeMeta();
    let ids = challenges.map((challenge) => challenge._id);
    if (query.category && query.category !== 'all') {
      ids = challenges.filter((challenge) => challenge.category === query.category).map((challenge) => challenge._id);
    } else if ((query.search ?? '').trim()) {
      const term = String(query.search).trim().toLowerCase();
      ids = challenges.filter((challenge) => challenge.title.toLowerCase().includes(term)).map((challenge) => challenge._id);
    }
    filter.challengeId = filter.challengeId ? filter.challengeId : { $in: ids };
  }

  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit ?? '10', 10) || 10));

  const [items, total] = await Promise.all([
    Submission.find(filter).sort({ submittedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Submission.countDocuments(filter),
  ]);

  const { byId } = await getChallengeMeta();
  return {
    items: items.map((submission) => serializeSubmission(submission, byId.get(String(submission.challengeId)))),
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1, hasNextPage: page * limit < total, hasPrevPage: page > 1 },
  };
}

export function serializeSubmission(submission, challenge = null) {
  return {
    id: String(submission._id),
    challengeId: String(submission.challengeId),
    challenge: challenge
      ? {
          id: String(challenge._id ?? challenge.id),
          title: challenge.title,
          slug: challenge.slug,
          category: challenge.category,
          difficulty: challenge.difficulty,
          xp: challenge.xp,
        }
      : null,
    score: submission.score,
    testsPassed: submission.testsPassed,
    totalTests: submission.totalTests,
    attemptNumber: submission.attemptNumber,
    timeTaken: submission.timeTaken,
    timeTakenLabel: formatDuration(submission.timeTaken),
    status: submission.status,
    isPerfect: submission.isPerfect,
    xpEarned: submission.xpEarned,
    bonusXp: submission.bonusXp,
    baseXp: submission.baseXp,
    isBestScore: submission.isBestScore,
    improvement: submission.improvement,
    submittedAt: submission.submittedAt,
    createdAt: submission.createdAt,
  };
}

/** Single submission — owner or admin only. */
export async function getSubmission({ submissionId, viewer }) {
  const submission = await Submission.findById(submissionId).lean();
  if (!submission) throw ApiError.notFound('Submission not found');
  const isOwner = String(submission.userId) === String(viewer._id);
  if (!isOwner && viewer.role !== 'admin') throw ApiError.forbidden('You can only view your own submissions');

  const { byId } = await getChallengeMeta();
  const detail = {
    ...serializeSubmission(submission, byId.get(String(submission.challengeId))),
    htmlCode: submission.htmlCode,
    cssCode: submission.cssCode,
    jsCode: submission.jsCode,
    categoryScores: submission.categoryScores,
    testResults: submission.testResults,
    verification: submission.verification,
    exceededTimeLimit: submission.exceededTimeLimit,
  };

  if (!isOwner) {
    const owner = await User.findById(submission.userId, 'name username avatar').lean();
    detail.user = owner ? { id: String(owner._id), name: owner.name, username: owner.username, avatar: owner.avatar } : null;
  }
  return detail;
}

/** Aggregated practice activity for the calendar widget. */
export async function getActivityCalendar({ userId, days = 182 }) {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  const rows = await Submission.aggregate([
    { $match: { userId, submittedAt: { $gte: from } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
        submissions: { $sum: 1 },
        xp: { $sum: '$xpEarned' },
        averageScore: { $avg: '$score' },
        bestScore: { $max: '$score' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byDay = new Map(rows.map((row) => [row._id, row]));
  const calendar = [];
  for (let index = days; index >= 0; index -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - index);
    const key = date.toISOString().slice(0, 10);
    const row = byDay.get(key);
    calendar.push({
      date: key,
      submissions: row?.submissions ?? 0,
      xp: row?.xp ?? 0,
      averageScore: row?.averageScore ? Math.round(row.averageScore) : 0,
      level: activityLevel(row?.submissions ?? 0),
    });
  }

  const activeDays = calendar.filter((day) => day.submissions > 0).length;
  return {
    calendar,
    summary: {
      days: calendar.length,
      activeDays,
      totalSubmissions: rows.reduce((sum, row) => sum + row.submissions, 0),
      totalXp: rows.reduce((sum, row) => sum + row.xp, 0),
      averageScore: rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.averageScore ?? 0), 0) / rows.length) : 0,
    },
  };
}

function activityLevel(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

export default { submitSolution, listSubmissions, getSubmission, getActivityCalendar, formatDuration, serializeSubmission };
