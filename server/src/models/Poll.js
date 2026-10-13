'use strict';
const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  },
  { _id: true }
);

const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, minlength: 3, maxlength: 300 },
    description: { type: String, default: '', maxlength: 1000 },
    options: {
      type: [optionSchema],
      required: true,
      validate: [
        (v) => v.length >= 2 && v.length <= 10,
        'A poll needs 2-10 options',
      ],
    },

    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true, index: true },

    anonymous: { type: Boolean, default: false },
    /** true => member may tick several options in one vote document. */
    allowMultiple: { type: Boolean, default: false },
    /** true => members may replace their vote until the poll closes. */
    allowChangeVote: { type: Boolean, default: false },

    visibility: { type: String, enum: ['team', 'admins'], default: 'team' },
    resultsVisibility: { type: String, enum: ['immediate', 'after_close'], default: 'immediate' },

    status: { type: String, enum: ['draft', 'active', 'closed', 'archived'], default: 'draft', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

pollSchema.index({ status: 1, endsAt: -1 });

/** Effective live status (time-based, without a DB write). */
pollSchema.methods.liveStatus = function liveStatus(now = new Date()) {
  if (this.status === 'draft' || this.status === 'archived') return this.status;
  if (this.status === 'closed') return 'closed';
  if (now < this.startsAt) return 'scheduled';
  if (now > this.endsAt) return 'closed';
  return 'active';
};

module.exports = mongoose.model('Poll', pollSchema);

/** ------------------------------------------------------------------ */
const voteSchema = new mongoose.Schema(
  {
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true, index: true },
    voter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    optionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      required: true,
      validate: [(v) => v.length >= 1, 'Pick at least one option'],
    },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hard guarantee: one vote document per member per poll (DB-level constraint).
voteSchema.index({ poll: 1, voter: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema);
module.exports.Vote = Vote;
