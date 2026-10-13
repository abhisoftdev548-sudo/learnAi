'use strict';
const router = require('express').Router();
const multer = require('multer');
const User = require('../models/User');
const { notify } = require('../models/notification.helper');
const { validate, required, minLength, maxLength, email, pattern } = require('../utils/validate');
const { ApiError, asyncHandler, ok } = require('../utils/errors');
const {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const { uploadImage } = require('../services/cloudinary.service');
const rateLimit = require('express-rate-limit');

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Try again later.', code: 'RATE_LIMITED' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again later.', code: 'RATE_LIMITED' },
});

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    bio: user.bio,
    skills: user.skills,
    photoUrl: user.photoUrl,
    githubUrl: user.githubUrl,
    linkedinUrl: user.linkedinUrl,
    points: user.points,
    completedChallenges: user.completedChallenges,
    eventsAttended: user.eventsAttended,
    createdAt: user.createdAt,
  };
}

/**
 * POST /api/auth/register
 * Public registration — always creates a *pending* account.
 * Accepts JSON or multipart/form-data (optional profile photo).
 * Becoming an admin via this endpoint is impossible: role/status are forced.
 */
router.post(
  '/register',
  registerLimiter,
  (req, res, next) => {
    // Accept either JSON or a single optional photo field.
    if (req.is('multipart/form-data')) {
      imageUpload.single('photo')(req, res, (err) => {
        if (err) return next(err);
        // Normalize: multer put the file on req.file; body stays in req.body.
        next();
      });
    } else {
      next();
    }
  },
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    validate(body, {
      name: [required('Full name is required'), minLength(2), maxLength(60)],
      username: [
        required('Username is required'),
        pattern(/^[a-zA-Z0-9_]{3,30}$/, 'Username must be 3-30 chars (letters, numbers, underscore)'),
      ],
      email: [required('Email is required'), email()],
      password: [required('Password is required'), minLength(8, 'Password must be at least 8 characters'), maxLength(128)],
      confirmPassword: [required('Please confirm your password')],
      bio: [maxLength(200, 'Bio must be at most 200 characters')],
    });

    if (body.password !== body.confirmPassword) {
      throw ApiError.badRequest('Passwords do not match', 'VALIDATION_ERROR');
    }

    const exists = await User.findOne({
      $or: [{ email: body.email.toLowerCase() }, { username: body.username.toLowerCase() }],
    });
    if (exists) {
      throw ApiError.conflict(
        exists.email === body.email.toLowerCase()
          ? 'An account with this email already exists'
          : 'This username is already taken',
        'DUPLICATE_ACCOUNT'
      );
    }

    const passwordHash = await User.hashPassword(body.password);
    const user = await User.create({
      name: body.name.trim(),
      username: body.username.toLowerCase(),
      email: body.email.toLowerCase(),
      passwordHash,
      bio: (body.bio || '').trim(),
      role: 'member', // hard-coded: never taken from the client
      status: 'pending', // hard-coded: always awaiting approval
      photoUrl: req.file ? await uploadImage(req.file.buffer, 'growth-circle/avatars') : '',
    });

    // Tell admins there is someone to review.
    const admins = await User.find({ role: 'admin', status: 'approved' }).select('_id');
    await notify(admins.map((a) => a._id), 'general', 'New registration request',
      `${user.name} (@${user.username}) is waiting for approval.`, '/admin/approvals');

    return ok(res, { user: publicUser(user) }, 201);
  })
);

/**
 * POST /api/auth/login
 * Only approved accounts may establish a session. Pending/rejected/suspended
 * users receive 403 with a machine-readable code so the UI can explain why.
 */
router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      throw ApiError.badRequest('Email/username and password are required', 'VALIDATION_ERROR');
    }

    const id = String(identifier).trim().toLowerCase();
    const user = await User.findOne({ $or: [{ email: id }, { username: id }] }).select('+passwordHash');
    const invalid = ApiError.unauthorized('Invalid email/username or password', 'INVALID_CREDENTIALS');
    if (!user) throw invalid;

    const okPwd = await user.verifyPassword(password);
    if (!okPwd) throw invalid;

    if (user.status !== 'approved') {
      const messages = {
        pending: {
          message:
            'Your account is waiting for admin approval. You will be able to access the team platform after verification.',
          code: 'PENDING_APPROVAL',
        },
        rejected: {
          message: 'Your registration was rejected. Contact an administrator for more information.',
          code: 'ACCOUNT_REJECTED',
        },
        suspended: {
          message: 'Your account has been suspended. Contact an administrator.',
          code: 'ACCOUNT_SUSPENDED',
        },
      };
      const info = messages[user.status] || { message: 'Account not active', code: 'ACCOUNT_INACTIVE' };
      throw ApiError.forbidden(info.message, info.code);
    }

    setAuthCookie(res, signToken(user));
    return ok(res, { user: publicUser(user) });
  })
);

/**
 * GET /api/auth/me — session validation. Returns the *fresh* server-side user.
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    return ok(res, { user: publicUser(req.user) });
  })
);

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return ok(res, { message: 'Logged out' });
});

module.exports = router;
module.exports.publicUser = publicUser;
