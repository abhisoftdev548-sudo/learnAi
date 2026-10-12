import mongoose from 'mongoose';
import { Challenge, Submission } from '../models/index.js';
import { ApiError } from '../utils/http.js';
import { BASE_XP } from './progressionService.js';
export async function list({ page, limit, category, difficulty, search }, userId) {
  const filter = { deletedAt: null, ...(category && { category }), ...(difficulty && { difficulty }), ...(search && { title: mongoose.trusted({ $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }) }) };
  const [items, total] = await Promise.all([Challenge.find(filter).select('-starterHTML -starterCSS -starterJS -instructions -hints').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Challenge.countDocuments(filter)]);
  const solved = userId ? await Submission.distinct('challengeId', { userId, status: 'passed', challengeId: mongoose.trusted({ $in: items.map(item => item._id) }) }) : [];
  const completed = new Set(solved.map(String));
  return { items: items.map(item => ({ ...item, completed: completed.has(String(item._id)) })), total, page, limit };
}
export async function detail(id, admin = false) {
  const query = Challenge.findOne({ _id: id, deletedAt: null });
  if (admin) query.select('+testCases');
  const challenge = await query;
  if (!challenge) throw new ApiError(404, 'Challenge not found');
  return challenge;
}
export async function create(data, userId) { return Challenge.create({ ...data, xp: data.xp ?? BASE_XP[data.difficulty], createdBy: userId }); }
export async function update(id, data) {
  // Published attempts must keep consistent scoring and category history.
  const challenge = await Challenge.findOneAndUpdate({ _id: id, deletedAt: null, submissionCount: 0 }, { $set: { ...data, xp: data.xp ?? BASE_XP[data.difficulty] } }, { new: true, runValidators: true }).select('+testCases');
  if (!challenge) { await detail(id); throw new ApiError(409, 'Challenges with submissions are immutable; create a new challenge instead'); }
  return challenge;
}
export async function remove(id) {
  const result = await Challenge.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: new Date() });
  if (!result) throw new ApiError(404, 'Challenge not found');
}

export async function progress(id, userId) {
  await detail(id);
  const [attempts, passed] = await Promise.all([Submission.countDocuments({ userId, challengeId: id }), Submission.exists({ userId, challengeId: id, status: 'passed' })]);
  return { attempts, completed: !!passed };
}
