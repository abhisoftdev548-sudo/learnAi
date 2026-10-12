import mongoose from 'mongoose';
import { User, Challenge, Submission } from '../models/index.js';
import { ApiError } from '../utils/http.js';
import { evaluateSubmission } from './evaluationService.js';
import { advanceStreak, calculateXP, calculateLevel } from './progressionService.js';
import { awardAchievements } from './achievementService.js';
export async function submit(userId, input) {
  return mongoose.connection.transaction(async session => {
    // Serialize submissions for one user. Transaction retry prevents lost XP,
    // duplicate first-solve awards and concurrent attempt-limit bypasses.
    const user = await User.findOneAndUpdate({ _id: userId }, { $inc: { submissionLock: 1 } }, { new: true, session });
    if (!user) throw new ApiError(401, 'Unauthorized');
    const challenge = await Challenge.findOne({ _id: input.challengeId, deletedAt: null }).select('+testCases').session(session);
    if (!challenge) throw new ApiError(404, 'Challenge not found');
    const attempts = await Submission.countDocuments({ userId, challengeId: challenge._id }).session(session);
    if (attempts >= challenge.maxAttempts) throw new ApiError(409, 'Maximum attempts reached');
    const evaluation = await evaluateSubmission(challenge, input);
    const firstSolve = evaluation.status === 'passed' && !(await Submission.exists({ userId, challengeId: challenge._id, status: 'passed' }).session(session));
    const now = new Date();
    const streak = evaluation.status === 'passed' ? advanceStreak(user, now) : { newDay: false, currentStreak: user.currentStreak };
    if (evaluation.status === 'passed') {
      user.currentStreak = streak.currentStreak; user.longestStreak = streak.longestStreak; user.lastPracticeDate = streak.lastPracticeDate;
    }
    const xpEarned = calculateXP({ firstSolve, difficulty: challenge.difficulty, xp: challenge.xp, score: evaluation.score, attemptNumber: attempts + 1, streak: streak.currentStreak, newDay: streak.newDay });
    user.xp += xpEarned; user.level = calculateLevel(user.xp);
    user.totalScore += evaluation.score; user.submissionCount += 1;
    user.bestScore = Math.max(user.bestScore, evaluation.score);
    if (firstSolve) { user.challengesSolved += 1; user.categorySolved[challenge.category] += 1; }
    await user.save({ session });
    await Challenge.updateOne({ _id: challenge._id }, { $inc: { submissionCount: 1, totalScore: evaluation.score, solvedCount: firstSolve ? 1 : 0 } }, { session });
    const [submission] = await Submission.create([{ ...input, userId, category: challenge.category, ...evaluation, attemptNumber: attempts + 1, firstSolve, xpEarned, submittedAt: now }], { session });
    const achievements = await awardAchievements(user, session);
    return { submission, achievements, level: user.level, currentStreak: user.currentStreak };
  });
}
export async function history(userId, { page, limit }) {
  const filter = { userId };
  const [items, total] = await Promise.all([
    Submission.find(filter).populate('challengeId', 'title category difficulty deletedAt').sort({ submittedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Submission.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}
export async function detail(id, userId) {
  const submission = await Submission.findOne({ _id: id, userId }).select('+htmlCode +cssCode +jsCode').populate('challengeId', 'title category difficulty deletedAt');
  if (!submission) throw new ApiError(404, 'Submission not found');
  return submission;
}
