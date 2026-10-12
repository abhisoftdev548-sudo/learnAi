import * as auth from '../services/authService.js';
import { ok } from '../utils/http.js';
import { profile } from '../services/profileService.js';
export async function register(req, res) { const user = await auth.register(req.validated.body); auth.setSession(res, user); return ok(res, auth.publicUser(user), 'Registered successfully', 201); }
export async function login(req, res) { const user = await auth.login(req.validated.body); auth.setSession(res, user); return ok(res, auth.publicUser(user), 'Logged in'); }
export async function logout(req, res) { await auth.logout(req.user, res); return ok(res, {}, 'Logged out of all sessions'); }
export async function me(req, res) { return ok(res, await profile({ _id: req.user._id }, true)); }
