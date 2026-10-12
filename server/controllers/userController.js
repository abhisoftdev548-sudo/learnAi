import * as service from '../services/profileService.js';
import { leaderboard } from '../services/leaderboardService.js';
import { ok, ApiError } from '../utils/http.js';
export async function me(req, res) { return ok(res, await service.profile({ _id: req.user._id }, true)); }
export async function profile(req, res) {
  if (!/^[a-z0-9_]{3,30}$/i.test(req.params.username)) throw new ApiError(400, 'Invalid username');
  return ok(res, await service.profile({ username: req.params.username.toLowerCase() }));
}
export async function update(req, res) { return ok(res, await service.updateProfile(req.user._id, req.validated.body), 'Profile updated'); }
export async function ranking(req, res) { return ok(res, await leaderboard(req.user._id, req.validated.query)); }

export async function achievements(req, res) { return ok(res, await service.achievementDefinitions()); }
