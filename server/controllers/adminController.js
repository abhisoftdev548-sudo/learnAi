import * as service from '../services/adminService.js';
import { ok } from '../utils/http.js';
export async function dashboard(req, res) { return ok(res, await service.dashboard()); }
export async function users(req, res) { return ok(res, await service.users(req.validated.query)); }
export async function submissions(req, res) { return ok(res, await service.submissions(req.validated.query)); }
export async function teams(req, res) { return ok(res, await service.teamStats(req.validated.query)); }
export async function createTeam(req, res) { return ok(res, await service.createTeam(req.validated.body, req.user._id), 'Team created', 201); }
export async function assignTeam(req, res) { return ok(res, await service.assignTeam(req.params.id, req.validated.body.teamId), 'Membership updated'); }
export async function myTeam(req, res) { return ok(res, await service.myTeam(req.user.teamId)); }
