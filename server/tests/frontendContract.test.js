import { describe, it, expect, vi, afterEach } from 'vitest';
import { challengeQuery } from '../utils/validation.js';
import { list, progress } from '../services/challengeService.js';
import { Challenge, Submission } from '../models/index.js';
afterEach(() => vi.restoreAllMocks());
describe('database-backed frontend read contracts (database mocked)', () => {
  it('accepts bounded search and rejects unknown filters', () => {
    expect(challengeQuery.safeParse({ search: 'profile', category: 'HTML' }).success).toBe(true);
    expect(challengeQuery.safeParse({ search: 'x'.repeat(101) }).success).toBe(false);
    expect(challengeQuery.safeParse({ xp: '100' }).success).toBe(false);
  });
  it('escapes literal search metacharacters and returns user completion flags', async () => {
    const id = 'a'.repeat(24), userId = 'b'.repeat(24);
    const cursor = {}; for (const method of ['select', 'sort', 'skip', 'limit']) cursor[method] = vi.fn().mockReturnValue(cursor);
    cursor.lean = vi.fn().mockResolvedValue([{ _id: id, title: '[card]+' }]);
    const find = vi.spyOn(Challenge, 'find').mockReturnValue(cursor);
    vi.spyOn(Challenge, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Submission, 'distinct').mockResolvedValue([id]);
    const result = await list({ page: 1, limit: 12, search: '[card]+' }, userId);
    expect(find.mock.calls[0][0].title.$regex).toBe('\\[card\\]\\+');
    expect(result.items[0].completed).toBe(true);
    expect(Submission.distinct.mock.calls[0][1].userId).toBe(userId);
  });
  it('reports persisted attempt counts and distinct completion for the logged-in user', async () => {
    vi.spyOn(Challenge, 'findOne').mockResolvedValue({ _id: 'c'.repeat(24) });
    vi.spyOn(Submission, 'countDocuments').mockResolvedValue(2);
    vi.spyOn(Submission, 'exists').mockResolvedValue({ _id: 'd'.repeat(24) });
    expect(await progress('c'.repeat(24), 'a'.repeat(24))).toEqual({ attempts: 2, completed: true });
  });
});
