import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

/**
 * Rate limits protect the auth endpoints and the submission pipeline.
 * Disabled automatically in the test environment (RATE_LIMITS_ENABLED=false).
 */
function createLimiter({ windowMs, max, message, code }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isTest || !env.rateLimitsEnabled,
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: { message, code } });
    },
  });
}

export const apiLimiter = createLimiter({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.apiMax,
  message: 'Too many requests, please slow down.',
  code: 'RATE_LIMITED',
});

export const authLimiter = createLimiter({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.authMax,
  message: 'Too many authentication attempts, please try again later.',
  code: 'AUTH_RATE_LIMITED',
});

export const submissionLimiter = createLimiter({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.submissionMax,
  message: 'Too many submissions in a short period, please slow down.',
  code: 'SUBMISSION_RATE_LIMITED',
});

export default { apiLimiter, authLimiter, submissionLimiter };
