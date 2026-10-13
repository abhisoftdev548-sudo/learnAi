'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const STATUSES = ['pending', 'approved', 'rejected', 'suspended'];
const ROLES = ['member', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    },
    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: ROLES, default: 'member', index: true },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },

    bio: { type: String, trim: true, maxlength: 200, default: '' },
    skills: { type: [String], default: [], validate: (v) => v.length <= 20 },
    photoUrl: { type: String, default: '' },
    githubUrl: { type: String, trim: true, default: '' },
    linkedinUrl: { type: String, trim: true, default: '' },

    // Denormalized scoreboard (recomputed server-side from approved reviews).
    points: { type: Number, default: 0, min: 0 },
    completedChallenges: { type: Number, default: 0, min: 0 },
    eventsAttended: { type: Number, default: 0, min: 0 },
    lastScoredAt: { type: Date, default: null },

    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ status: 1, role: 1 });
userSchema.index({ points: -1 });

/** Hash a plain password (never store plaintext). */
userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/** Fields a member may edit on their own profile. */
userSchema.statics.UPDATABLE_MEMBER_FIELDS = [
  'name',
  'bio',
  'skills',
  'githubUrl',
  'linkedinUrl',
  'photoUrl',
];

module.exports = mongoose.model('User', userSchema);
