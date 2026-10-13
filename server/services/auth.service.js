import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { isStrongEnoughPassword, sanitizeText } from '../utils/validate.js';
import { signAccessToken } from '../utils/jwt.js';

/** Register a new team member. Role can never be self-assigned. */
export async function registerUser({ name, username, email, password }) {
  const normalizedUsername = String(username).trim().toLowerCase();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!isStrongEnoughPassword(password)) {
    throw ApiError.unprocessable('Password must be at least 8 characters and contain a letter and a number', [
      { field: 'password', message: 'weak password' },
    ]);
  }

  const existing = await User.findOne({ $or: [{ username: normalizedUsername }, { email: normalizedEmail }] })
    .select('username email')
    .lean();
  if (existing) {
    const field = existing.username === normalizedUsername ? 'username' : 'email';
    throw ApiError.conflict(`${field === 'username' ? 'Username' : 'Email'} is already registered`, { field });
  }

  const user = await User.create({
    name: sanitizeText(name, { maxLength: 80 }),
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    role: 'user',
    avatar: buildAvatarUrl(normalizedUsername),
  });

  return { user, token: signAccessToken(user) };
}

/** Verify credentials by username or email. */
export async function authenticate({ identifier, password }) {
  const value = String(identifier ?? '').trim().toLowerCase();
  if (!value || !password) throw ApiError.badRequest('Username/email and password are required');

  const user = await User.findOne({ $or: [{ username: value }, { email: value }] }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized('Invalid credentials');

  user.lastLoginAt = new Date();
  user.lastActiveAt = new Date();
  await user.save();

  return { user, token: signAccessToken(user) };
}

export async function changePassword(user, { currentPassword, newPassword }) {
  if (!isStrongEnoughPassword(newPassword)) {
    throw ApiError.unprocessable('New password must be at least 8 characters and contain a letter and a number');
  }
  const withPassword = await User.findById(user._id).select('+password');
  const matches = await withPassword.comparePassword(currentPassword);
  if (!matches) throw ApiError.unauthorized('Current password is incorrect');

  withPassword.password = newPassword;
  await withPassword.save();
  return { updatedAt: withPassword.updatedAt };
}

const AVATAR_PALETTE = [
  ['#4f46e5', '#7c3aed'],
  ['#2563eb', '#7c3aed'],
  ['#0ea5e9', '#4f46e5'],
  ['#7c3aed', '#db2777'],
  ['#0d9488', '#2563eb'],
  ['#f59e0b', '#e11d48'],
  ['#16a34a', '#0ea5e9'],
  ['#6366f1', '#22d3ee'],
];

/**
 * Deterministic, dependency-free avatar: an inline SVG data URI with the user's
 * initials on a gradient derived from their username. Works offline, so profiles
 * render identically in every environment.
 */
export function buildAvatarUrl(username = 'user', name = '') {
  const seed = String(username || 'user');
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }
  const [from, to] = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  const initials = String(name || seed)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || seed.slice(0, 2).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${escapeXml(initials)}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g)"/><text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Inter, Segoe UI, system-ui, sans-serif" font-size="52" font-weight="600" fill="#ffffff">${escapeXml(initials)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);
}

export default { registerUser, authenticate, changePassword, buildAvatarUrl };
