import Achievement from '../models/Achievement.js';
import { ACHIEVEMENT_CRITERIA } from '../config/constants.js';
import { applyXp } from './xp.service.js';

/**
 * Achievements are data-driven: the catalogue holds declarative criteria and this
 * service evaluates them against the user's *live* statistics. It is called after
 * every submission (and when a profile is requested) so progress stays fresh.
 */

/** Current progress towards a single achievement. */
export function achievementProgress(achievement, stats) {
  const threshold = Math.max(1, achievement.criteria?.threshold ?? 1);
  let value = 0;

  switch (achievement.criteria?.type) {
    case ACHIEVEMENT_CRITERIA.CHALLENGES_SOLVED:
      value = stats.challengesSolved ?? 0;
      break;
    case ACHIEVEMENT_CRITERIA.PERFECT_SCORES:
      value = stats.perfectScores ?? 0;
      break;
    case ACHIEVEMENT_CRITERIA.STREAK:
      value = Math.max(stats.currentStreak ?? 0, stats.longestStreak ?? 0);
      break;
    case ACHIEVEMENT_CRITERIA.CATEGORY_SOLVED:
      value = (stats.categorySolved?.[achievement.criteria.category] ?? 0);
      break;
    case ACHIEVEMENT_CRITERIA.FIRST_ATTEMPT:
      value = stats.firstAttemptSuccesses ?? 0;
      break;
    case ACHIEVEMENT_CRITERIA.XP:
      value = stats.xp ?? 0;
      break;
    default:
      value = 0;
  }

  const percent = Math.min(100, Math.round((value / threshold) * 100));
  return {
    value,
    threshold,
    percent,
    earned: value >= threshold,
    remaining: Math.max(0, threshold - value),
  };
}

/** Derive the stats object used by the evaluator from a user document. */
export function statsFromUser(user, { categoryTotals = {} } = {}) {
  const categorySolved = { HTML: 0, CSS: 0, JavaScript: 0 };
  for (const entry of user.solvedChallenges ?? []) {
    if (entry.category in categorySolved) categorySolved[entry.category] += 1;
  }
  return {
    xp: user.xp ?? 0,
    level: user.level ?? 1,
    challengesSolved: user.challengesSolved ?? (user.solvedChallenges?.length ?? 0),
    perfectScores: user.perfectScores ?? 0,
    firstAttemptSuccesses: user.firstAttemptSuccesses ?? 0,
    currentStreak: user.currentStreak ?? 0,
    longestStreak: user.longestStreak ?? 0,
    categorySolved,
    categoryTotals,
  };
}

/**
 * Evaluate the catalogue for a user and award any newly unlocked achievement.
 * Mutates `user` (achievements + XP) — the caller persists it.
 */
export async function evaluateAchievements(user, { categoryTotals = {}, challenge = null } = {}) {
  const catalogue = await Achievement.find({}).sort({ order: 1 }).lean();
  const stats = statsFromUser(user, { categoryTotals });
  const earnedKeys = new Set((user.achievements ?? []).map((entry) => entry.key));
  const newlyEarned = [];

  for (const achievement of catalogue) {
    if (earnedKeys.has(achievement.key)) continue;
    const progress = achievementProgress(achievement, stats);
    if (!progress.earned) continue;

    user.achievements.push({
      key: achievement.key,
      earnedAt: new Date(),
      challenge: challenge?._id ?? null,
    });
    earnedKeys.add(achievement.key);
    const xpAward = achievement.xpReward ? applyXp(user, achievement.xpReward) : null;
    if (achievement.xpReward) user.achievementXp = (user.achievementXp ?? 0) + achievement.xpReward;
    newlyEarned.push({
      key: achievement.key,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      tier: achievement.tier,
      category: achievement.category,
      xpReward: achievement.xpReward ?? 0,
      earnedAt: new Date(),
      progress,
      levelAfter: xpAward?.levelAfter ?? user.level,
    });
  }

  return { newlyEarned, stats };
}

/** Full catalogue with per-user progress (used by the achievements page). */
export async function achievementOverview(user, { categoryTotals = {} } = {}) {
  const catalogue = await Achievement.find({}).sort({ order: 1 }).lean();
  const stats = statsFromUser(user, { categoryTotals });
  const earnedMap = new Map((user.achievements ?? []).map((entry) => [entry.key, entry.earnedAt]));

  const items = catalogue.map((achievement) => {
    const progress = achievementProgress(achievement, stats);
    return {
      key: achievement.key,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      tier: achievement.tier,
      category: achievement.category,
      xpReward: achievement.xpReward,
      hidden: achievement.hidden,
      earned: earnedMap.has(achievement.key),
      earnedAt: earnedMap.get(achievement.key) ?? null,
      progress,
    };
  });

  const earned = items.filter((item) => item.earned);
  return {
    items,
    summary: {
      total: items.length,
      earned: earned.length,
      locked: items.length - earned.length,
      completionPercent: items.length ? Math.round((earned.length / items.length) * 100) : 0,
      xpFromAchievements: earned.reduce((sum, item) => sum + (item.xpReward ?? 0), 0),
    },
  };
}

export default { evaluateAchievements, achievementOverview, achievementProgress, statsFromUser };
