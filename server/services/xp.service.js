import { LEVEL_STEP, MAX_SCORE, XP_BONUS, XP_BY_DIFFICULTY } from '../config/constants.js';

/** Total XP required to reach `level` (level 1 = 0 XP). */
export function xpForLevel(level) {
  const safeLevel = Math.max(1, Math.floor(level));
  return LEVEL_STEP * safeLevel * (safeLevel - 1);
}

/** Highest level unlocked by `xp`. */
export function levelFromXp(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  // Solve LEVEL_STEP * L * (L - 1) <= xp for L:
  //   L = (1 + sqrt(1 + 4 * xp / LEVEL_STEP)) / 2
  const level = Math.floor((1 + Math.sqrt(1 + (4 * safeXp) / LEVEL_STEP)) / 2);
  return Math.max(1, level);
}

export function levelProgress(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const level = levelFromXp(safeXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = nextLevelXp - currentLevelXp;
  const intoLevel = safeXp - currentLevelXp;
  return {
    level,
    xp: safeXp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel: intoLevel,
    xpForNextLevel: span,
    xpToNextLevel: Math.max(0, nextLevelXp - safeXp),
    progressPercent: span > 0 ? Math.min(100, Math.round((intoLevel / span) * 1000) / 10) : 100,
  };
}

/** Base XP available for a challenge difficulty. */
export function baseXpForDifficulty(difficulty) {
  return XP_BY_DIFFICULTY[difficulty] ?? XP_BY_DIFFICULTY.Easy;
}

/**
 * XP awarded for a submission.
 *
 * Rules (deterministic, documented in the README):
 *  - Base XP scales with the *improvement* over the user's previous best score on
 *    the same challenge, so repeated attempts cannot farm XP:
 *        base = round(challengeXp * max(0, score - previousBest) / 100)
 *  - Bonuses are only granted when the submission sets a new personal best:
 *        perfect score      -> +50% of the challenge XP
 *        first-attempt pass -> +25% of the challenge XP
 *        practice streak    -> +5 XP per streak day, capped at 7 days (35 XP)
 *  - Exceeding the challenge time limit keeps the score but forfeits bonuses.
 */
export function calculateXpAward({
  challengeXp,
  score,
  previousBestScore = 0,
  attemptNumber = 1,
  passingScore = 70,
  currentStreak = 0,
  exceededTimeLimit = false,
}) {
  const safeChallengeXp = Math.max(0, Math.round(challengeXp || 0));
  const safeScore = Math.min(MAX_SCORE, Math.max(0, Math.round(score)));
  const improvement = Math.max(0, safeScore - Math.max(0, previousBestScore));
  const isNewBest = safeScore > Math.max(0, previousBestScore);

  const baseXp = Math.round((safeChallengeXp * improvement) / MAX_SCORE);
  const bonuses = [];

  if (isNewBest && !exceededTimeLimit) {
    if (safeScore === MAX_SCORE) {
      bonuses.push({ key: 'perfect-score', label: 'Perfect score', amount: Math.round(safeChallengeXp * XP_BONUS.perfectScoreRate) });
    }
    if (attemptNumber === 1 && safeScore >= passingScore) {
      bonuses.push({ key: 'first-attempt', label: 'First attempt success', amount: Math.round(safeChallengeXp * XP_BONUS.firstAttemptRate) });
    }
    if (currentStreak > 1) {
      const streakDays = Math.min(currentStreak, XP_BONUS.streakDayCap);
      bonuses.push({ key: 'streak', label: `${streakDays} day streak`, amount: streakDays * XP_BONUS.streakPerDay });
    }
  }

  const bonusXp = bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
  return {
    baseXp,
    bonusXp,
    totalXp: baseXp + bonusXp,
    improvement,
    isNewBest,
    bonuses: bonuses.map((bonus) => ({ ...bonus, amount: Math.round(bonus.amount) })),
  };
}

/** Apply XP to a user document, keeping `level` in sync. Returns level change info. */
export function applyXp(user, amount) {
  const delta = Math.max(0, Math.round(amount || 0));
  const levelBefore = user.level ?? levelFromXp(user.xp ?? 0);
  user.xp = Math.max(0, (user.xp ?? 0) + delta);
  const levelAfter = levelFromXp(user.xp);
  user.level = levelAfter;
  return {
    xpAwarded: delta,
    xpTotal: user.xp,
    levelBefore,
    levelAfter,
    levelUps: Math.max(0, levelAfter - levelBefore),
  };
}

export default {
  xpForLevel,
  levelFromXp,
  levelProgress,
  baseXpForDifficulty,
  calculateXpAward,
  applyXp,
};
