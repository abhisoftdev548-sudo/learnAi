/** Streak helpers — all day math is done on UTC calendar days. */

export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfUtcDay(date = new Date()) {
  const value = new Date(date);
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function dayKey(date) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

/** Whole calendar days between two dates (b - a). */
export function daysBetween(a, b) {
  if (!a || !b) return null;
  const diff = startOfUtcDay(b).getTime() - startOfUtcDay(a).getTime();
  return Math.round(diff / DAY_MS);
}

/**
 * Pure streak transition used by the submission flow.
 *
 *  - first ever practice           -> streak 1
 *  - practice again the same day   -> streak unchanged
 *  - practice the next day         -> streak + 1
 *  - one or more missed days       -> streak resets to 1
 */
export function computeStreakUpdate({ currentStreak = 0, longestStreak = 0, lastPracticeDate = null, now = new Date() }) {
  const safeCurrent = Math.max(0, Number(currentStreak) || 0);
  const safeLongest = Math.max(0, Number(longestStreak) || 0);
  const gap = daysBetween(lastPracticeDate, now);

  let streak = safeCurrent;
  let isNewDay = false;
  let streakBroken = false;

  if (lastPracticeDate === null || lastPracticeDate === undefined) {
    streak = 1;
    isNewDay = true;
  } else if (gap === 0) {
    streak = safeCurrent > 0 ? safeCurrent : 1;
    isNewDay = false;
  } else if (gap === 1) {
    streak = safeCurrent + 1;
    isNewDay = true;
  } else if (gap !== null && gap > 1) {
    streakBroken = safeCurrent > 1;
    streak = 1;
    isNewDay = true;
  } else {
    // lastPracticeDate is in the future (clock skew) — treat as same day.
    streak = safeCurrent > 0 ? safeCurrent : 1;
    isNewDay = false;
  }

  return {
    currentStreak: streak,
    longestStreak: Math.max(safeLongest, streak),
    lastPracticeDate: now,
    isNewDay,
    streakBroken,
    daysSinceLastPractice: gap,
  };
}

/** Mutates the given user document with the streak transition. */
export function recordPractice(user, now = new Date()) {
  const update = computeStreakUpdate({
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastPracticeDate: user.lastPracticeDate,
    now,
  });
  user.currentStreak = update.currentStreak;
  user.longestStreak = update.longestStreak;
  user.lastPracticeDate = now;
  return update;
}

/**
 * Streak state for display.
 *
 * The stored `currentStreak` is only valid while the user has practised today or
 * yesterday; once a full day has been missed the run is over, so the *effective*
 * streak reported to the client drops back to 0 (the stored value is reset the
 * next time the user practises).
 */
export function streakStatus(user, now = new Date()) {
  const gap = daysBetween(user.lastPracticeDate, now);
  const stored = Math.max(0, Number(user.currentStreak) || 0);
  const practicedToday = gap === 0;
  const expired = gap === null ? stored === 0 : gap > 1;
  const currentStreak = expired ? 0 : stored;

  return {
    currentStreak,
    storedStreak: stored,
    longestStreak: Math.max(user.longestStreak ?? 0, stored),
    practicedToday,
    expired,
    daysSinceLastPractice: gap,
    atRisk: gap !== null && gap >= 1 && currentStreak > 0,
  };
}

export default { computeStreakUpdate, recordPractice, streakStatus, dayKey, daysBetween, startOfUtcDay };
