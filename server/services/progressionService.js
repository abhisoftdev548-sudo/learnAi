export const BASE_XP = Object.freeze({ Easy: 50, Medium: 100, Hard: 200 });
export const calculateLevel = xp => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
const DAY = 86400000;
export const utcDay = date => Math.floor(new Date(date).getTime() / DAY);
export function currentStreak(user, now = new Date()) {
  return user.lastPracticeDate && utcDay(now) - utcDay(user.lastPracticeDate) <= 1 ? user.currentStreak : 0;
}
export function advanceStreak(user, now = new Date()) {
  const gap = user.lastPracticeDate ? utcDay(now) - utcDay(user.lastPracticeDate) : Infinity;
  const streak = gap <= 0 ? user.currentStreak : gap === 1 ? user.currentStreak + 1 : 1;
  return { currentStreak: streak, longestStreak: Math.max(user.longestStreak, streak), lastPracticeDate: now, newDay: gap > 0 };
}
export function calculateXP({ firstSolve, difficulty, xp, score, attemptNumber, streak, newDay }) {
  if (!firstSolve) return 0;
  return (xp ?? BASE_XP[difficulty]) + (score === 100 ? 20 : 0) + (attemptNumber === 1 ? 10 : 0) + (newDay && streak > 1 ? Math.min(streak, 7) * 5 : 0);
}
export const SCORE_WEIGHTS = Object.freeze({ structure: 20, layout: 25, functionality: 30, responsive: 15, quality: 10 });
export function calculateScore(tests, results) {
  const active = Object.keys(SCORE_WEIGHTS).filter(g => tests.some(t => t.group === g));
  const denominator = active.reduce((sum, g) => sum + SCORE_WEIGHTS[g], 0);
  const earned = active.reduce((sum, g) => {
    const indices = tests.flatMap((t, i) => t.group === g ? [i] : []);
    return sum + SCORE_WEIGHTS[g] * indices.filter(i => results[i].passed).length / indices.length;
  }, 0);
  const testsPassed = results.filter(r => r.passed).length;
  const allPassed = tests.length > 0 && testsPassed === tests.length;
  return { score: allPassed ? 100 : denominator ? Math.min(99, Math.round(100 * earned / denominator)) : 0, testsPassed, totalTests: tests.length, status: tests.length && testsPassed === tests.length ? 'passed' : testsPassed ? 'partial' : 'failed' };
}
