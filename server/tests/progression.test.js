import { describe, it, expect } from 'vitest';
import { advanceStreak, currentStreak, calculateXP, calculateLevel, calculateScore } from '../services/progressionService.js';
import { meetsRequirement } from '../services/achievementService.js';
import { periodStart } from '../services/leaderboardService.js';
import { achievements } from '../seed/data.js';
describe('XP and levels', () => {
  it('awards base, perfect, first-attempt, and bounded streak bonuses', () => {
    expect(calculateXP({ firstSolve: true, difficulty: 'Easy', score: 100, attemptNumber: 1, streak: 1, newDay: true })).toBe(80);
    expect(calculateXP({ firstSolve: true, difficulty: 'Hard', score: 100, attemptNumber: 2, streak: 40, newDay: true })).toBe(255);
    expect(calculateXP({ firstSolve: true, xp: 70, score: 100, attemptNumber: 2, streak: 5, newDay: false })).toBe(90);
    expect(calculateXP({ firstSolve: false, difficulty: 'Hard', score: 100, attemptNumber: 1 })).toBe(0);
  });
  it('uses consistent level boundaries', () => { expect([0, 99, 100, 399, 400, 900].map(calculateLevel)).toEqual([1, 1, 2, 2, 3, 4]); });
});
describe('UTC streaks', () => {
  const base = { currentStreak: 6, longestStreak: 10, lastPracticeDate: new Date('2026-10-11T23:59:59Z') };
  it('increments on consecutive UTC dates', () => { expect(advanceStreak(base, new Date('2026-10-12T00:00:00Z'))).toMatchObject({ currentStreak: 7, longestStreak: 10, newDay: true }); });
  it('does not increment twice on one day', () => { expect(advanceStreak(base, new Date('2026-10-11T23:59:59Z')).currentStreak).toBe(6); });
  it('resets after missing a day', () => { expect(advanceStreak(base, new Date('2026-10-13')).currentStreak).toBe(1); expect(currentStreak(base, new Date('2026-10-13'))).toBe(0); });
  it('starts at one and updates longest', () => { expect(advanceStreak({ currentStreak: 0, longestStreak: 0, lastPracticeDate: null }, new Date())).toMatchObject({ currentStreak: 1, longestStreak: 1 }); });
  it('handles month and leap-year boundaries', () => { expect(advanceStreak({ ...base, lastPracticeDate: new Date('2024-02-29') }, new Date('2024-03-01')).currentStreak).toBe(7); });
});
describe('weighted scoring', () => {
  const tests = ['structure', 'layout', 'functionality', 'responsive', 'quality'].map(group => ({ group }));
  it('uses the 20/25/30/15/10 weights', () => { expect(calculateScore(tests, [true, true, false, false, false].map(passed => ({ passed })))).toEqual({ score: 45, testsPassed: 2, totalTests: 5, status: 'partial' }); });
  it('normalizes absent groups and averages tests in a group', () => { expect(calculateScore([{ group: 'layout' }, { group: 'layout' }], [{ passed: true }, { passed: false }]).score).toBe(50); });
  it('handles all-pass, all-fail, and empty results', () => {
    expect(calculateScore(tests, tests.map(() => ({ passed: true })))).toMatchObject({ score: 100, status: 'passed' });
    expect(calculateScore(tests, tests.map(() => ({ passed: false })))).toMatchObject({ score: 0, status: 'failed' });
    expect(calculateScore([], [])).toMatchObject({ score: 0, status: 'failed' });
  });
});
describe('achievements and leaderboard windows', () => {
  it('unlocks all seeded requirements at their thresholds', () => {
    const user = { challengesSolved: 50, bestScore: 100, longestStreak: 30, categorySolved: { CSS: 4, JavaScript: 1 } };
    expect(achievements.every(a => meetsRequirement(user, a))).toBe(true);
    expect(meetsRequirement({ ...user, challengesSolved: 0 }, achievements[0])).toBe(false);
  });
  it('starts weeks on Monday UTC and months on first day', () => {
    expect(periodStart('weekly', new Date('2026-10-18T23:59:59Z')).toISOString()).toBe('2026-10-12T00:00:00.000Z');
    expect(periodStart('monthly', new Date('2026-10-18')).toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(periodStart('all-time')).toBeNull();
  });
});
