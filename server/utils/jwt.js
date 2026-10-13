import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from './ApiError.js';

/** Sign an access token for a user document. */
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      username: user.username,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
      issuer: env.jwtIssuer,
      audience: 'learnai-client',
    },
  );
}

/** Verify a JWT and return its payload (throws ApiError on failure). */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret, {
      issuer: env.jwtIssuer,
      audience: 'learnai-client',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Your session has expired, please sign in again', { code: 'TOKEN_EXPIRED' });
    }
    throw new ApiError(401, 'Invalid authentication token', { code: 'INVALID_TOKEN' });
  }
}

/** Short lived, single purpose ticket used to authorize sandbox measurements. */
export function signSandboxTicket({ userId, challengeId, version }) {
  return jwt.sign(
    {
      sub: String(userId),
      challengeId: String(challengeId),
      version: Number(version ?? 1),
      purpose: 'sandbox-measurement',
    },
    env.jwtSecret,
    {
      expiresIn: Math.floor(env.sandboxTicketTtlMs / 1000),
      issuer: env.jwtIssuer,
      audience: 'learnai-sandbox',
    },
  );
}

export function verifySandboxTicket(ticket, { userId, challengeId }) {
  try {
    const payload = jwt.verify(ticket, env.jwtSecret, {
      issuer: env.jwtIssuer,
      audience: 'learnai-sandbox',
    });
    if (payload.purpose !== 'sandbox-measurement') throw new Error('wrong purpose');
    if (String(payload.sub) !== String(userId)) throw new Error('ticket belongs to another user');
    if (String(payload.challengeId) !== String(challengeId)) throw new Error('ticket belongs to another challenge');
    return payload;
  } catch (error) {
    throw new ApiError(400, `Sandbox measurement ticket is invalid or expired (${error.message})`, {
      code: 'INVALID_SANDBOX_TICKET',
    });
  }
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export default { signAccessToken, verifyAccessToken, signSandboxTicket, verifySandboxTicket };
