import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import { CATEGORIES, ROLES } from '../config/constants.js';

const solvedChallengeSchema = new mongoose.Schema(
  {
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    difficulty: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    attempts: { type: Number, default: 1, min: 1 },
    firstAttempt: { type: Boolean, default: false },
    solvedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const earnedAchievementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', default: null },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      lowercase: true,
      unique: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [/^[a-z0-9_.]+$/, 'Username may only contain letters, numbers, underscores and dots'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: [280, 'Bio must be at most 280 characters'] },
    role: { type: String, enum: ROLES, default: 'user', index: true },

    xp: { type: Number, default: 0, min: 0, index: true },
    level: { type: Number, default: 1, min: 1 },
    totalScore: { type: Number, default: 0, min: 0 },
    challengesSolved: { type: Number, default: 0, min: 0 },
    perfectScores: { type: Number, default: 0, min: 0 },
    firstAttemptSuccesses: { type: Number, default: 0, min: 0 },
    submissionsCount: { type: Number, default: 0, min: 0 },
    /** XP granted by achievement rewards — keeps `xp` a fully reconciled ledger. */
    achievementXp: { type: Number, default: 0, min: 0 },

    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastPracticeDate: { type: Date, default: null },

    solvedChallenges: { type: [solvedChallengeSchema], default: [] },
    achievements: { type: [earnedAchievementSchema], default: [] },

    lastActiveAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: null },

    preferences: {
      editorFontSize: { type: Number, default: 14, min: 10, max: 24 },
      editorTheme: { type: String, enum: ['light', 'dark'], default: 'light' },
      tabSize: { type: Number, default: 2, min: 2, max: 8 },
      autoRun: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        ret.id = ret._id?.toString();
        delete ret._id;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

userSchema.index({ xp: -1, challengesSolved: -1 });
userSchema.index({ lastPracticeDate: -1 });
userSchema.index({ 'solvedChallenges.challenge': 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(env.bcryptRounds);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(String(candidate), this.password);
};

/** `challengesSolved` and `totalScore` are derived from the solved list. */
userSchema.methods.recalculateTotals = function recalculateTotals() {
  this.challengesSolved = this.solvedChallenges.length;
  this.totalScore = this.solvedChallenges.reduce((sum, entry) => sum + (entry.score ?? 0), 0);
  this.perfectScores = this.solvedChallenges.filter((entry) => entry.score === 100).length;
  return this;
};

userSchema.methods.hasAchievement = function hasAchievement(key) {
  return this.achievements.some((entry) => entry.key === key);
};

userSchema.methods.solvedFor = function solvedFor(challengeId) {
  if (!challengeId) return null;
  return this.solvedChallenges.find((entry) => String(entry.challenge) === String(challengeId)) ?? null;
};

/** Safe representation for other users. */
userSchema.methods.toPublicJSON = function toPublicJSON({ includeStats = true } = {}) {
  const base = {
    id: String(this._id),
    name: this.name,
    username: this.username,
    avatar: this.avatar,
    bio: this.bio,
    role: this.role,
    createdAt: this.createdAt,
    lastActiveAt: this.lastActiveAt,
  };
  if (!includeStats) return base;
  return {
    ...base,
    xp: this.xp,
    level: this.level,
    totalScore: this.totalScore,
    challengesSolved: this.challengesSolved,
    currentStreak: this.currentStreak,
    longestStreak: this.longestStreak,
    perfectScores: this.perfectScores,
    achievementCount: this.achievements?.length ?? 0,
  };
};

/** Private representation for the authenticated user (settings page etc). */
userSchema.methods.toPrivateJSON = function toPrivateJSON() {
  return {
    ...this.toPublicJSON(),
    email: this.email,
    preferences: this.preferences,
    submissionsCount: this.submissionsCount,
    firstAttemptSuccesses: this.firstAttemptSuccesses,
    lastPracticeDate: this.lastPracticeDate,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.models.User ?? mongoose.model('User', userSchema);

export default User;
