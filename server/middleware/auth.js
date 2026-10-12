import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { env, origins } from '../config/env.js';
import { ApiError } from '../utils/http.js';
export async function authenticate(req, res, next) {
  try {
    const payload = jwt.verify(req.cookies.session || '', env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'learnai', audience: 'learnai-api' });
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user || user.tokenVersion !== payload.version) throw new ApiError(401, 'Unauthorized');
    req.user = user; next();
  } catch (err) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name) || err.status === 401 || err.name === 'CastError') return next(new ApiError(401, 'Unauthorized'));
    next(err);
  }
}
export function adminOnly(req, res, next) { if (req.user.role !== 'admin') return next(new ApiError(403, 'Admin access required')); next(); }
// Mandatory on ALL writes, including login/logout, to prevent cookie-based CSRF.
export function checkOrigin(req, res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !origins.includes(req.get('origin'))) return next(new ApiError(403, 'Trusted Origin header required'));
  next();
}
