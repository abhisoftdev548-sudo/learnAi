'use strict';
const mongoose = require('mongoose');
const SubmissionReview = require('../models/SubmissionReview');
const Reward = require('../models/Reward');

/**
 * Recompute a member's denormalized score from authoritative review records.
 *
 * Rules:
 *  - only the *latest* review of each submission counts (isLatest: true)
 *  - only 'approved' reviews award points
 *  - completedChallenges counts distinct challenges with an approved latest review
 *  - lastScoredAt is the newest qualifying review timestamp (leaderboard tie-break)
 *
 * Call this whenever a review is created or revised so the leaderboard can
 * never drift from the actual scores.
 */
async function recalcUserScore(userId) {
  const uid = new mongoose.Types.ObjectId(String(userId));

  const [[submissionTotals], [rewardTotals]] = await Promise.all([
    SubmissionReview.aggregate([
    { $match: { member: uid, isLatest: true, status: 'approved' } },
    {
      $group: {
        _id: null,
        points: { $sum: '$pointsAwarded' },
        challenges: { $addToSet: '$challenge' },
        last: { $max: '$createdAt' },
      },
    },
    ]),
    Reward.aggregate([
      { $match: { member: uid } },
      { $group: { _id: null, points: { $sum: '$points' }, last: { $max: '$updatedAt' } } },
    ]),
  ]);

  const points = (submissionTotals?.points || 0) + (rewardTotals?.points || 0);
  const completed = submissionTotals ? submissionTotals.challenges.length : 0;
  const reviewLast = submissionTotals?.last ? new Date(submissionTotals.last).getTime() : 0;
  const rewardLast = rewardTotals?.last ? new Date(rewardTotals.last).getTime() : 0;
  const lastScoredAt = reviewLast || rewardLast ? new Date(Math.max(reviewLast, rewardLast)) : null;

  await mongoose.model('User').updateOne(
    { _id: uid },
    { $set: { points, completedChallenges: completed, lastScoredAt } }
  );
  return { points, completedChallenges: completed, lastScoredAt };
}

function periodStart(period) {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    const day = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - day);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'month') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return null;
}

/**
 * Ranked leaderboard.
 * Ranking: points DESC, completedChallenges DESC, lastScoredAt DESC (most recent
 * qualifying score wins ties — deterministic).
 *
 * period: 'all' | 'month' | 'week' — period scoring sums only the reviews whose
 * latest approved version was awarded inside the window.
 */
async function leaderboard({ period = 'all', limit = 100, forUserId = null } = {}) {
  const start = periodStart(period);

  let pipeline;
  if (start) {
    pipeline = [
      { $match: { isLatest: true, status: 'approved', createdAt: { $gte: start } } },
      {
        $group: {
          _id: '$member',
          points: { $sum: '$pointsAwarded' },
          challenges: { $addToSet: '$challenge' },
          last: { $max: '$createdAt' },
        },
      },
    ];
  } else {
    pipeline = [{ $match: { isLatest: true, status: 'approved' } },
      {
        $group: {
          _id: '$member',
          points: { $sum: '$pointsAwarded' },
          challenges: { $addToSet: '$challenge' },
          last: { $max: '$createdAt' },
        },
      },
    ];
  }

  const [scored, rewarded] = await Promise.all([
    SubmissionReview.aggregate(pipeline),
    Reward.aggregate([
      ...(start ? [{ $match: { updatedAt: { $gte: start } } }] : []),
      {
        $group: {
          _id: '$member',
          points: { $sum: '$points' },
          last: { $max: '$updatedAt' },
        },
      },
    ]),
  ]);
  const byUser = new Map(
    scored.map((s) => [String(s._id), {
      points: s.points,
      completed: s.challenges.length,
      lastScoredAt: s.last || null,
    }])
  );
  rewarded.forEach((r) => {
    const key = String(r._id);
    const current = byUser.get(key) || { points: 0, completed: 0, lastScoredAt: null };
    current.points += r.points;
    if (!current.lastScoredAt || new Date(r.last) > new Date(current.lastScoredAt)) current.lastScoredAt = r.last;
    byUser.set(key, current);
  });

  const members = await mongoose.model('User')
    .find({ status: 'approved' })
    .select('name username photoUrl points completedChallenges lastScoredAt')
    .lean();

  const rows = members
    .map((m) => {
      const s = byUser.get(String(m._id));
      if (start && !s) return null;
      const points = s ? s.points : m.points;
      const completed = s ? s.completed : m.completedChallenges;
      const last = s ? s.lastScoredAt : m.lastScoredAt;
      return {
        userId: m._id,
        name: m.name,
        username: m.username,
        photoUrl: m.photoUrl,
        points,
        completedChallenges: completed,
        lastScoredAt: last,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      b.points - a.points ||
      b.completedChallenges - a.completedChallenges ||
      new Date(b.lastScoredAt || 0) - new Date(a.lastScoredAt || 0) ||
      String(a.username).localeCompare(String(b.username))
    )
    .slice(0, limit)
    .map((r, i) => ({ rank: i + 1, ...r }));

  let myRank = null;
  if (forUserId) {
    const idx = rows.findIndex((r) => String(r.userId) === String(forUserId));
    if (idx !== -1) myRank = rows[idx];
    else {
      // Rank outside the returned window: compute it from the full sort.
      const full = members
        .map((m) => {
          const s = byUser.get(String(m._id));
          if (start && !s) return null;
          return {
            userId: m._id,
            points: s ? s.points : m.points,
            completedChallenges: s ? s.completed : m.completedChallenges,
            lastScoredAt: s ? s.lastScoredAt : m.lastScoredAt,
          };
        })
        .filter(Boolean)
        .sort((a, b) =>
          b.points - a.points ||
          b.completedChallenges - a.completedChallenges ||
          new Date(b.lastScoredAt || 0) - new Date(a.lastScoredAt || 0) ||
          String(a.userId).localeCompare(String(b.userId))
        );
      const fidx = full.findIndex((r) => String(r.userId) === String(forUserId));
      if (fidx !== -1) myRank = { rank: fidx + 1, ...full[fidx] };
    }
  }

  return { rows, me: myRank };
}

module.exports = { recalcUserScore, leaderboard, periodStart };
