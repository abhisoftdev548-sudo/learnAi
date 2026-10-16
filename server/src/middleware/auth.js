'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/errors');

const COOKIE_NAME = 'tf_token';

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.cookieSameSite,
    path: '/',
    maxAge: env.cookieMaxAgeMs,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.cookieSameSite,
    path: '/',
  });
}

/** Verify the auth cookie and attach the fresh user document to req.user. */
const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw ApiError.unauthorized('Authentication required', 'NO_SESSION');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Session expired. Please log in again.', 'SESSION_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid session', 'INVALID_SESSION');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists', 'NO_SESSION');

  req.user = user;
  next();
});

/** Account must be approved (admin bypasses nothing here — admins are approved too). */
function requireApproved(req, res, next) {
  const status = req.user?.status;
  if (status === 'approved') return next();
  if (status === 'pending') {
    return next(
      ApiError.forbidden(
        'Your account is waiting for admin approval. You will be able to access the team platform after verification.',
        'PENDING_APPROVAL'
      )
    );
  }
  if (status === 'rejected') {
    return next(
      ApiError.forbidden(
        'Your registration was rejected. Contact an administrator for more information.',
        'ACCOUNT_REJECTED'
      )
    );
  }
  if (status === 'suspended') {
    return next(
      ApiError.forbidden('Your account has been suspended. Contact an administrator.', 'ACCOUNT_SUSPENDED')
    );
  }
  return next(ApiError.forbidden('Account not active', 'ACCOUNT_INACTIVE'));
}

/** Admin-only gate. Role comes from the server-side database — never the client. */
function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  return next(ApiError.forbidden('Administrator access required', 'ADMIN_REQUIRED'));
}

/**
 * CSRF hardening for cookie-based auth: when a browser sends an Origin header
 * on a state-changing request, it must match an allowed origin (or the API's
 * own origin). Requests without an Origin header (curl, server-to-server) are
 * allowed — SameSite=Lax cookies already block cross-site form posts.
 */
function originCheck(req, res, next) {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  const host = req.headers.host;
  const selfOrigins = [`http://${host}`, `https://${host}`];
  const allowed = [...selfOrigins, ...env.allowedOrigins];
  if (allowed.includes(origin)) return next();
  return next(ApiError.forbidden('Cross-origin request blocked', 'CSRF_ORIGIN_BLOCKED'));
}

module.exports = {
  COOKIE_NAME,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireApproved,
  requireAdmin,
  originCheck,
};
