/**
 * Domain constants shared by models, services and the API layer.
 * Values here are part of the platform contract with the frontend.
 */

export const CATEGORIES = Object.freeze(['HTML', 'CSS', 'JavaScript']);

export const CATEGORY_KEYS = Object.freeze({
  HTML: 'html',
  CSS: 'css',
  JavaScript: 'javascript',
});

export const DIFFICULTIES = Object.freeze(['Easy', 'Medium', 'Hard']);

export const ROLES = Object.freeze(['user', 'admin']);

export const SUBMISSION_STATUS = Object.freeze({
  PASSED: 'passed',
  FAILED: 'failed',
});

/** Scoring rubric — the five groups always add up to 100 points. */
export const SCORING_GROUPS = Object.freeze([
  { key: 'html', label: 'HTML Structure', maxPoints: 20 },
  { key: 'css', label: 'CSS / Layout', maxPoints: 25 },
  { key: 'functionality', label: 'Functionality', maxPoints: 30 },
  { key: 'responsiveness', label: 'Responsiveness', maxPoints: 15 },
  { key: 'codeQuality', label: 'Code Quality', maxPoints: 10 },
]);

export const SCORING_GROUP_KEYS = Object.freeze(SCORING_GROUPS.map((group) => group.key));

export const MAX_SCORE = SCORING_GROUPS.reduce((sum, group) => sum + group.maxPoints, 0); // 100

export const DEFAULT_PASSING_SCORE = 70;

/** Base XP per difficulty. */
export const XP_BY_DIFFICULTY = Object.freeze({
  Easy: 50,
  Medium: 100,
  Hard: 200,
});

/** Bonus XP rules (documented in README). */
export const XP_BONUS = Object.freeze({
  perfectScoreRate: 0.5, // +50% of base XP
  firstAttemptRate: 0.25, // +25% of base XP
  streakPerDay: 5,
  streakDayCap: 7, // maximum 35 XP from streak bonus
});

export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_TIME_LIMIT_MINUTES = 30;
export const MIN_ATTEMPTS = 1;
export const MAX_ATTEMPTS_LIMIT = 10;
export const MIN_TIME_LIMIT = 5;
export const MAX_TIME_LIMIT = 240;

/** Level thresholds: reaching level L requires 50 * L * (L - 1) total XP. */
export const LEVEL_STEP = 50;

export const ACHIEVEMENT_CRITERIA = Object.freeze({
  CHALLENGES_SOLVED: 'challenges-solved',
  PERFECT_SCORES: 'perfect-scores',
  STREAK: 'streak',
  CATEGORY_SOLVED: 'category-solved',
  FIRST_ATTEMPT: 'first-attempt-success',
  XP: 'xp',
});

export const ACHIEVEMENT_KEYS = Object.freeze({
  FIRST_CHALLENGE: 'first-challenge',
  CHALLENGES_10: 'challenges-10',
  CHALLENGES_50: 'challenges-50',
  PERFECT_SCORE: 'perfect-score',
  STREAK_7: 'streak-7',
  STREAK_30: 'streak-30',
  CSS_MASTER: 'css-master',
  HTML_MASTER: 'html-master',
  JAVASCRIPT_BEGINNER: 'javascript-beginner',
  FIRST_ATTEMPT_HERO: 'first-attempt-hero',
  XP_1000: 'xp-1000',
  XP_5000: 'xp-5000',
});

export const LEADERBOARD_PERIODS = Object.freeze(['weekly', 'monthly', 'all-time']);

export const PAGINATION = Object.freeze({
  defaultPage: 1,
  defaultLimit: 12,
  maxLimit: 100,
});

export const CODE_LIMITS = Object.freeze({
  html: 60000,
  css: 50000,
  js: 60000,
});

export const TEST_CASE_GROUPS = SCORING_GROUPS.map((group) => group.key);

export const TEST_CASE_KINDS = Object.freeze(['static', 'measure']);

export const TEST_CASE_TYPES = Object.freeze([
  // static (server verified, no code execution)
  'html-selector',
  'html-attribute',
  'html-text',
  'html-count',
  'css-declaration',
  'css-media',
  'css-selector',
  'css-keyframes',
  'js-pattern',
  'code-quality',
  // measured in the sandboxed client iframe, judged on the server
  'measure',
  'viewport',
]);

export default {
  CATEGORIES,
  DIFFICULTIES,
  ROLES,
  SCORING_GROUPS,
  XP_BY_DIFFICULTY,
  ACHIEVEMENT_KEYS,
  LEADERBOARD_PERIODS,
};
