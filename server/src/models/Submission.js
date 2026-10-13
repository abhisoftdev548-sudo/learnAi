'use strict';
const mongoose = require('mongoose');

const REVIEW_STATUSES = ['submitted', 'under_review', 'needs_changes', 'approved', 'rejected'];

const answerSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    type: { type: String, required: true },
    value: { type: String, default: '', maxlength: 4000 },
    fileName: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** 1-based attempt number; history is retained across resubmissions. */
    attempt: { type: Number, required: true, min: 1, default: 1 },
    answers: { type: [answerSchema], default: [] },

    status: { type: String, enum: REVIEW_STATUSES, default: 'submitted', index: true },
    submittedAt: { type: Date, default: Date.now },
    isOnTime: { type: Boolean, default: true },

    // Denormalized latest review snapshot (authoritative data lives in SubmissionReview).
    score: { type: Number, default: null },
    feedback: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },

    resubmissionRequested: { type: Boolean, default: false },
    previousSubmission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', default: null },
  },
  { timestamps: true }
);

// One attempt per member per challenge.
submissionSchema.index({ challenge: 1, member: 1, attempt: 1 }, { unique: true });
// Fast "does my latest attempt exist" lookup.
submissionSchema.index({ challenge: 1, member: 1, createdAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
module.exports.REVIEW_STATUSES = REVIEW_STATUSES;

/** ------------------------------------------------------------------ */
const reviewSchema = new mongoose.Schema(
  {
    submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    pointsAwarded: { type: Number, required: true, min: 0 },
    feedback: { type: String, default: '', maxlength: 3000 },
    status: { type: String, enum: REVIEW_STATUSES, required: true },

    // Exactly one *latest* review per submission; older ones are kept as history
    // with isLatest=false. Points are only ever summed over isLatest+approved.
    isLatest: { type: Boolean, default: true },
    previousPoints: { type: Number, default: null },
    revision: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

reviewSchema.index({ submission: 1, isLatest: 1 });
reviewSchema.index({ member: 1, isLatest: 1, status: 1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });

const SubmissionReview = mongoose.model('SubmissionReview', reviewSchema);
module.exports.SubmissionReview = SubmissionReview;
module.exports.reviewSchema = reviewSchema;
