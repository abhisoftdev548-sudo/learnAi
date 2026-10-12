import * as service from '../services/submissionService.js';
import { ok } from '../utils/http.js';
export async function create(req, res) { return ok(res, await service.submit(req.user._id, req.validated.body), 'Challenge submitted successfully', 201); }
export async function history(req, res) { return ok(res, await service.history(req.user._id, req.validated.query)); }
export async function detail(req, res) { return ok(res, await service.detail(req.params.id, req.user._id)); }
