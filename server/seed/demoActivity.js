/**
 * Demo activity generator.
 *
 * Builds believable practice history for the seeded team members: submissions are
 * scored with the *real* aggregation logic (`aggregateResults`) and the user
 * aggregates are updated with the *real* XP / streak / achievement services, so
 * the leaderboard, calendars and dashboards always show consistent numbers.
 *
 * Rules honoured here (the same ones the API enforces):
 *  - a challenge can only be attempted `maxAttempts` times
 *  - XP comes from score improvement + bonuses, never from repeats
 *  - streaks advance on consecutive UTC days and reset after a missed day
 */
import Submission from '../models/Submission.js';
import { aggregateResults } from '../services/scoring.service.js';
import { applyXp, calculateXpAward } from '../services/xp.service.js';
import { computeStreakUpdate, streakStatus } from '../services/streak.service.js';
import { evaluateAchievements } from '../services/achievement.service.js';
import { formatDuration } from '../services/submission.service.js';

/** Deterministic tiny PRNG so re-seeding produces the same data. */
function createRng(seed) {
  let state = 0;
  for (let index = 0; index < String(seed).length; index += 1) {
    state = (state * 31 + String(seed).charCodeAt(index)) % 2147483647;
  }
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Team member profiles.
 *
 *  cadence      — practice days per week (controls the spacing of active days)
 *  historyDays  — how far back the active-day pool reaches
 *  skill        — probability that a single test passes on a first attempt
 *  targetSolved — how many distinct challenges end up solved
 *  lastOffset   — days since the most recent practice (0 = today)
 *  tail         — consecutive active days ending at `lastOffset` (the live streak)
 *  rotate       — offset into the challenge catalogue so people progress differently
 *  retries      — chance of retrying a failed challenge instead of moving on
 */
const PROFILES = {
  maya: { cadence: 6, historyDays: 120, skill: 0.95, targetSolved: 11, lastOffset: 0, tail: 5, rotate: 0, retries: 0.95 },
  daniel: { cadence: 5, historyDays: 120, skill: 0.92, targetSolved: 10, lastOffset: 0, tail: 3, rotate: 3, retries: 0.9 },
  priya: { cadence: 4, historyDays: 100, skill: 0.88, targetSolved: 8, lastOffset: 1, tail: 3, rotate: 6, retries: 0.85 },
  lukas: { cadence: 3, historyDays: 110, skill: 0.8, targetSolved: 5, lastOffset: 4, tail: 1, rotate: 2, retries: 0.7 },
  sofia: { cadence: 2, historyDays: 90, skill: 0.72, targetSolved: 3, lastOffset: 6, tail: 1, rotate: 8, retries: 0.6 },
  tom: { cadence: 2, historyDays: 80, skill: 0.66, targetSolved: 4, lastOffset: 1, tail: 2, rotate: 10, retries: 0.65 },
};

const DEFAULT_PROFILE = { cadence: 2, historyDays: 90, skill: 0.75, targetSolved: 3, lastOffset: 2, tail: 1, rotate: 0, retries: 0.7 };

const DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 };

/**
 * Simulate which tests pass for a target skill level, then let the real scoring
 * aggregation decide the score (so scores always match the test results).
 */
function simulateResult(challenge, skill, rng) {
  const results = (challenge.testCases ?? []).map((test) => {
    // Harder groups are less likely to pass at lower skill levels.
    const groupPenalty = { html: 0, css: 0.02, functionality: 0.08, responsiveness: 0.05, codeQuality: 0.03 }[test.group] ?? 0;
    const chance = clamp(skill - groupPenalty, 0, 1);
    const passed = rng() < chance;
    return {
      testId: test.id,
      name: test.name,
      group: test.group,
      weight: test.weight ?? 1,
      passed,
      actual: passed ? 'satisfied' : 'not satisfied',
      expected: null,
      message: passed ? '' : 'Seeded team activity',
      verifiedBy: test.kind === 'measure' ? 'sandbox' : 'server',
    };
  });
  return aggregateResults({ challenge, results, providerName: 'client-sandbox' });
}

/**
 * Timestamp `days` ago at a plausible practice hour, never in the future.
 * `minutesAgo` keeps today's entries in chronological order (later slots are
 * always later in time) and is also the fallback when the evening hour has not
 * happened yet.
 */
function practiceTime(days, index, now, minutesAgo) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(17 + Math.floor(index / 3), (index * 23) % 60, 0, 0);
  if (date > now) return new Date(now.getTime() - minutesAgo * 60 * 1000);
  return date;
}

/** Active day offsets (0 = today), oldest first, ending with the live streak. */
function buildActiveDays(profile, rng) {
  const active = new Set();
  for (let index = 0; index < profile.tail; index += 1) {
    active.add(profile.lastOffset + index);
  }

  let daysSinceActive = profile.tail > 0 ? 0 : profile.lastOffset;
  for (let offset = profile.lastOffset + profile.tail; offset <= profile.historyDays; offset += 1) {
    daysSinceActive += 1;
    if (rng() < profile.cadence / 7 || daysSinceActive >= 9) {
      active.add(offset);
      daysSinceActive = 0;
    }
  }

  return [...active].sort((a, b) => b - a); // oldest first
}

/** Challenge plan: everybody starts on the easier work and rotates through. */
function buildPlan(challenges, profile) {
  const ordered = [...challenges].sort((a, b) => {
    const byDifficulty = (DIFFICULTY_ORDER[a.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.difficulty] ?? 0);
    if (byDifficulty !== 0) return byDifficulty;
    return (a.order ?? 0) - (b.order ?? 0);
  });
  const rotate = profile.rotate % Math.max(1, ordered.length);
  return [...ordered.slice(rotate), ...ordered.slice(0, rotate)];
}

/**
 * Walk the plan and simulate the attempt sequence: attempt a challenge until it
 * passes or the user gives up / runs out of attempts, then move to the next one.
 */
function simulateProgression({ plan, profile, rng }) {
  const submissions = [];
  let solved = 0;

  for (const challenge of plan) {
    if (solved >= profile.targetSolved) break;

    const maxAttempts = challenge.maxAttempts ?? 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;
      const learning = (attempt - 1) * 0.1;
      const skill = clamp(profile.skill + learning + (rng() - 0.5) * 0.05, 0.05, 0.99);
      const scoring = simulateResult(challenge, skill, rng);
      submissions.push({ challenge, attemptNumber: attempt, scoring });

      if (scoring.status === 'passed') {
        solved += 1;
        break;
      }
      if (rng() > profile.retries) break; // moved on without using every attempt
    }
  }

  return submissions;
}

export async function seedDemoActivity({ users, challenges, categoryTotals }) {
  const published = challenges.filter((challenge) => challenge.isPublished !== false);
  if (!published.length) return { created: 0 };

  const now = new Date();
  let created = 0;

  for (const user of users) {
    const profile = PROFILES[user.username] ?? DEFAULT_PROFILE;
    const rng = createRng(`${user.username}-seed`);
    const plan = buildPlan(published, profile);
    const submissions = simulateProgression({ plan, profile, rng });
    if (!submissions.length) continue;

    // Spread the attempts over the most recent active days so the newest days of
    // the practice calendar are always busy (people work on the current week).
    const activeDays = buildActiveDays(profile, rng);
    const daysNeeded = clamp(Math.ceil(submissions.length / 1.4), 1, activeDays.length);
    const days = activeDays.slice(activeDays.length - daysNeeded);

    const perDay = Array.from({ length: days.length }, () => 1);
    let extra = submissions.length - days.length;
    for (let index = 0; extra > 0; index = (index + 1) % days.length) {
      perDay[index] += 1;
      extra -= 1;
    }

    const queue = [...submissions];
    const bestByChallenge = new Map();

    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      const offset = days[dayIndex];

      for (let slot = 0; slot < perDay[dayIndex]; slot += 1) {
        const entry = queue.shift();
        if (!entry) break;

        const { challenge, attemptNumber, scoring } = entry;
        const key = String(challenge._id);
        const previousBest = bestByChallenge.get(key) ?? 0;
        bestByChallenge.set(key, Math.max(previousBest, scoring.score));

        const minutesAgo = (perDay[dayIndex] - slot) * 17 + 20;
        const submissionDate = practiceTime(offset, dayIndex * 2 + slot, now, minutesAgo);
        const streakUpdate = computeStreakUpdate({
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          lastPracticeDate: user.lastPracticeDate,
          now: submissionDate,
        });
        user.currentStreak = streakUpdate.currentStreak;
        user.longestStreak = streakUpdate.longestStreak;
        user.lastPracticeDate = submissionDate;

        const award = calculateXpAward({
          challengeXp: challenge.xp,
          score: scoring.score,
          previousBestScore: previousBest,
          attemptNumber,
          passingScore: challenge.passingScore,
          currentStreak: user.currentStreak,
        });
        applyXp(user, award.totalXp);

        // eslint-disable-next-line no-await-in-loop
        await Submission.create({
          userId: user._id,
          challengeId: challenge._id,
          htmlCode: `<!-- seed: ${user.username} attempt ${attemptNumber} on ${challenge.title} -->\n${challenge.starterHTML ?? ''}`,
          cssCode: `/* seed attempt */\n${challenge.starterCSS ?? ''}`,
          jsCode: `// seed attempt\n${challenge.starterJS ?? ''}`,
          score: scoring.score,
          testsPassed: scoring.testsPassed,
          totalTests: scoring.totalTests,
          attemptNumber,
          timeTaken: 480 + Math.round(rng() * 900),
          status: scoring.status,
          submittedAt: submissionDate,
          isPerfect: scoring.isPerfect,
          xpEarned: award.totalXp,
          bonusXp: award.bonusXp,
          baseXp: award.baseXp,
          isBestScore: award.isNewBest,
          improvement: award.improvement,
          categoryScores: scoring.categoryScores,
          testResults: scoring.testResults,
          verification: scoring.verification,
        });
        created += 1;

        const solvedEntry = user.solvedFor(challenge._id);
        if (solvedEntry) {
          solvedEntry.score = Math.max(solvedEntry.score ?? 0, scoring.score);
          solvedEntry.attempts = Math.max(solvedEntry.attempts ?? 1, attemptNumber);
        } else if (scoring.status === 'passed') {
          user.solvedChallenges.push({
            challenge: challenge._id,
            category: challenge.category,
            difficulty: challenge.difficulty,
            score: scoring.score,
            attempts: attemptNumber,
            firstAttempt: attemptNumber === 1,
            solvedAt: submissionDate,
          });
          if (attemptNumber === 1) user.firstAttemptSuccesses = (user.firstAttemptSuccesses ?? 0) + 1;
        }

        user.submissionsCount = (user.submissionsCount ?? 0) + 1;
        user.lastActiveAt = submissionDate;
        user.lastLoginAt = submissionDate;
      }
    }

    user.recalculateTotals();
    // eslint-disable-next-line no-await-in-loop
    await evaluateAchievements(user, { categoryTotals });

    // A run that ended before yesterday is over: report it as such immediately.
    user.currentStreak = streakStatus(user, now).currentStreak;
    // eslint-disable-next-line no-await-in-loop
    await user.save();
  }

  return { created, durationHint: formatDuration(900) };
}

export default { seedDemoActivity };
