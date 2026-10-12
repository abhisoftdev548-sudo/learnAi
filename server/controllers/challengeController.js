import * as service from '../services/challengeService.js';
import { ok } from '../utils/http.js';
export async function list(req, res) { return ok(res, await service.list(req.validated.query, req.user._id)); }
export async function detail(req, res) { return ok(res, await service.detail(req.params.id, req.user.role === 'admin')); }
export async function create(req, res) { return ok(res, await service.create(req.validated.body, req.user._id), 'Challenge created', 201); }
export async function update(req, res) { return ok(res, await service.update(req.params.id, req.validated.body), 'Challenge updated'); }
export async function remove(req, res) { await service.remove(req.params.id); return ok(res, {}, 'Challenge archived'); }

export async function progress(req, res) { return ok(res, await service.progress(req.params.id, req.user._id)); }
