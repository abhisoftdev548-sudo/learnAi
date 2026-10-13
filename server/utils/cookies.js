import env from '../config/env.js';

/** Build the cookie options used for the auth cookie. */
export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    maxAge: env.cookieMaxAgeMs,
    path: '/',
    // Prevent the cookie from leaking on cross-site subrequests.
    priority: 'high',
  };
}

export function setAuthCookie(res, token) {
  res.cookie(env.cookieName, token, authCookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie(env.cookieName, { ...authCookieOptions(), maxAge: undefined });
}

/** Read the auth token from the HTTP-only cookie (fallback: Authorization header). */
export function readAuthToken(req) {
  const fromCookie = req.cookies?.[env.cookieName];
  if (fromCookie) return fromCookie;
  const header = req.headers?.authorization ?? '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

/** Uniform success envelope used by every endpoint. */
export function sendSuccess(res, data = null, { status = 200, meta = null, message } = {}) {
  const payload = { success: true };
  if (data !== undefined) payload.data = data;
  if (meta) payload.meta = meta;
  if (message) payload.message = message;
  return res.status(status).json(payload);
}

export default { setAuthCookie, clearAuthCookie, readAuthToken, sendSuccess, authCookieOptions };
