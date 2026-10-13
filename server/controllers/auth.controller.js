import asyncHandler from '../utils/asyncHandler.js';
import { clearAuthCookie, sendSuccess, setAuthCookie } from '../utils/cookies.js';
import { authenticate, changePassword, registerUser } from '../services/auth.service.js';
import { validateBody, USERNAME_PATTERN, EMAIL_PATTERN } from '../utils/validate.js';
import { getUserStats } from '../services/user.service.js';
import ApiError from '../utils/ApiError.js';

const registerSchema = {
  name: { type: 'string', required: true, min: 2, max: 80 },
  username: { type: 'string', required: true, min: 3, max: 30, pattern: USERNAME_PATTERN },
  email: { type: 'string', required: true, max: 160, pattern: EMAIL_PATTERN },
  password: { type: 'string', required: true, min: 8, max: 128 },
};

const loginSchema = {
  identifier: { type: 'string', min: 3, max: 160 },
  username: { type: 'string', min: 3, max: 160 },
  email: { type: 'string', min: 3, max: 160 },
  password: { type: 'string', required: true, min: 1, max: 128 },
};

export const register = asyncHandler(async (req, res) => {
  const body = validateBody(req, registerSchema);
  const { user, token } = await registerUser(body);
  setAuthCookie(res, token);
  return sendSuccess(res, { user: user.toPrivateJSON(), token: undefined }, { status: 201, message: 'Welcome to LearnAI!' });
});

export const login = asyncHandler(async (req, res) => {
  const body = validateBody(req, loginSchema);
  const identifier = body.identifier ?? body.username ?? body.email;
  if (!identifier) throw ApiError.unprocessable('Username or email is required', [{ field: 'identifier', message: 'required' }]);
  const { user, token } = await authenticate({ identifier, password: body.password });
  setAuthCookie(res, token);
  return sendSuccess(res, { user: user.toPrivateJSON() }, { message: `Welcome back, ${user.name}!` });
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  return sendSuccess(res, { loggedOut: true }, { message: 'Signed out' });
});

/** Current session user + headline stats. */
export const me = asyncHandler(async (req, res) => {
  const stats = await getUserStats(req.user, { includeRecent: false });
  return sendSuccess(res, { user: req.user.toPrivateJSON(), stats });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const body = validateBody(req, {
    currentPassword: { type: 'string', required: true, min: 1, max: 128 },
    newPassword: { type: 'string', required: true, min: 8, max: 128 },
  });
  await changePassword(req.user, body);
  return sendSuccess(res, { updated: true }, { message: 'Password updated successfully' });
});

export default { register, login, logout, me, updatePassword };
