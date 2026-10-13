import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { readAuthToken } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/jwt.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Resolve the authenticated user from the HTTP-only cookie (or a bearer token
 * for API clients). Never trusts client supplied ids.
 */
async function resolveUser(req) {
  const token = readAuthToken(req);
  if (!token) return null;
  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'Your account no longer exists', { code: 'ACCOUNT_NOT_FOUND' });
  return user;
}

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  try {
    req.user = await resolveUser(req);
  } catch {
    req.user = null;
  }
  next();
});

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw ApiError.unauthorized('You must be signed in to access this resource');
  req.user = user;
  next();
});

/** Role based authorization — admins only. */
export const requireAdmin = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== 'admin') {
    return next(new ApiError(403, 'Administrator access is required for this action', { code: 'ADMIN_ONLY' }));
  }
  return next();
};

/** Allow access when the requester is the owner of the resource or an admin. */
export const requireOwnerOrAdmin = (getOwnerId) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  const ownerId = getOwnerId(req);
  if (req.user.role === 'admin' || String(req.user._id) === String(ownerId)) return next();
  return next(ApiError.forbidden('You can only access your own resources'));
};

export default { requireAuth, optionalAuth, requireAdmin, requireOwnerOrAdmin };
