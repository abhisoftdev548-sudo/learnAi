import { afterEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { User, Challenge, Submission } from '../models/index.js';
import * as achievementService from '../services/achievementService.js';
import { submit } from '../services/submissionService.js';
const session = {};
const query = value => ({ session: vi.fn().mockResolvedValue(value), select: vi.fn().mockReturnValue({ session: vi.fn().mockResolvedValue(value) }) });
function setup({ attempts = 0, priorSolve = false, maxAttempts = 3, missing = false } = {}) {
  vi.spyOn(mongoose.connection, 'transaction').mockImplementation(fn => fn(session));
  const user = { _id: 'a'.repeat(24), xp: 0, level: 1, totalScore: 0, submissionCount: 0, bestScore: 0, challengesSolved: 0, currentStreak: 0, longestStreak: 0, lastPracticeDate: null, categorySolved: { HTML: 0, CSS: 0, JavaScript: 0 }, save: vi.fn().mockResolvedValue() };
  vi.spyOn(User, 'findOneAndUpdate').mockResolvedValue(user);
  vi.spyOn(Challenge, 'findOne').mockReturnValue(query(missing ? null : { _id: 'b'.repeat(24), category: 'HTML', difficulty: 'Easy', xp: 50, maxAttempts, testCases: [{ type: 'html-selector', group: 'structure', label: 'Heading', selector: 'h1' }] }));
  vi.spyOn(Submission, 'countDocuments').mockReturnValue(query(attempts));
  vi.spyOn(Submission, 'exists').mockReturnValue(query(priorSolve ? { _id: 'x' } : null));
  vi.spyOn(Challenge, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
  vi.spyOn(Submission, 'create').mockImplementation(async ([data]) => [data]);
  vi.spyOn(achievementService, 'awardAchievements').mockResolvedValue([]);
  return user;
}
const input = { challengeId: 'b'.repeat(24), htmlCode: '<h1>Heading</h1>', cssCode: '', jsCode: '', timeTaken: 10 };
afterEach(() => vi.restoreAllMocks());
describe('submission orchestration (transaction/database calls mocked)', () => {
  it('uses one transaction for statistics, history and awards', async () => {
    const user = setup(); const result = await submit(user._id, input);
    expect(result.submission).toMatchObject({ score: 100, xpEarned: 80, firstSolve: true, attemptNumber: 1, status: 'passed' });
    expect(user).toMatchObject({ xp: 80, submissionCount: 1, challengesSolved: 1, currentStreak: 1, totalScore: 100 });
    expect(user.categorySolved.HTML).toBe(1);
    expect(user.save).toHaveBeenCalledWith({ session });
    expect(Submission.create).toHaveBeenCalledWith(expect.any(Array), { session });
    expect(achievementService.awardAchievements).toHaveBeenCalledWith(user, session);
    expect(Challenge.updateOne).toHaveBeenCalledWith({ _id: input.challengeId }, { $inc: { submissionCount: 1, totalScore: 100, solvedCount: 1 } }, { session });
  });
  it('stores failing attempts without XP, solved count or streak', async () => {
    const user = setup(); const result = await submit(user._id, { ...input, htmlCode: '<p>No heading</p>' });
    expect(result.submission).toMatchObject({ status: 'failed', xpEarned: 0 });
    expect(user).toMatchObject({ xp: 0, submissionCount: 1, challengesSolved: 0, currentStreak: 0 });
  });
  it('only awards a first solve once', async () => {
    const user = setup({ attempts: 1, priorSolve: true }); const result = await submit(user._id, input);
    expect(result.submission).toMatchObject({ status: 'passed', xpEarned: 0, firstSolve: false, attemptNumber: 2 });
    expect(user.challengesSolved).toBe(0);
  });
  it('rejects exhausted attempts before storing a result', async () => {
    const user = setup({ attempts: 3 }); await expect(submit(user._id, input)).rejects.toMatchObject({ status: 409 });
    expect(Submission.create).not.toHaveBeenCalled(); expect(user.save).not.toHaveBeenCalled();
  });
  it('rejects missing or archived challenges', async () => { const user = setup({ missing: true }); await expect(submit(user._id, input)).rejects.toMatchObject({ status: 404 }); });
  it('propagates persistence failures so the transaction can abort', async () => {
    const user = setup(); vi.mocked(Submission.create).mockRejectedValue(new Error('storage failure'));
    await expect(submit(user._id, input)).rejects.toThrow('storage failure'); expect(achievementService.awardAchievements).not.toHaveBeenCalled();
  });
});
