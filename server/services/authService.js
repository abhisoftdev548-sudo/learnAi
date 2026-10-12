import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { env, secureCookie } from '../config/env.js';
import { ApiError, publicUser } from '../utils/http.js';
const cookie = { httpOnly: true, secure: secureCookie, sameSite: env.COOKIE_SAME_SITE, path: '/' };
const dummyHash = await bcrypt.hash('dummy-comparison-password', 12);
export function setSession(res, user) {
  const token = jwt.sign({ version: user.tokenVersion ?? 0 }, env.JWT_SECRET, { subject: String(user._id), expiresIn: env.JWT_EXPIRES_IN, algorithm: 'HS256', issuer: 'learnai', audience: 'learnai-api' });
  const payload = jwt.decode(token);
  res.cookie('session', token, { ...cookie, maxAge: (payload.exp - payload.iat) * 1000 });
}
export async function register(data) { return User.create(data); }
export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password +email +tokenVersion');
  const matches = await bcrypt.compare(password, user?.password || dummyHash);
  if (!user || !matches) throw new ApiError(401, 'Invalid email or password');
  return user;
}
export async function logout(user, res) {
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
  res.clearCookie('session', cookie);
}
export { publicUser };
