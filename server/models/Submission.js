import mongoose from 'mongoose';
import { SUBMISSION_STATUS } from '../config/constants.js';

const testResultSchema = new mongoose.Schema(
  {
    testId: { type: String, required: true },
    name: { type: String, required: true },
    group: { type: String, required: true },
    weight: { type: Number, default: 1 },
    passed: { type: Boolean, default: false },
    earned: { type: Number, default: 0 },
    verifiedBy: { type: String, enum: ['server', 'sandbox', 'remote-runner'], default: 'server' },
    actual: { type: mongoose.Schema.Types.Mixed, default: null },
    expected: { type: mongoose.Schema.Types.Mixed, default: null },
    message: { type: String, default: '' },
  },
  { _id: false },
);

const submissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },

    htmlCode: { type: String, default: '', maxlength: 60000 },
    cssCode: { type: String, default: '', maxlength: 50000 },
    jsCode: { type: String, default: '', maxlength: 60000 },

    score: { type: Number, required: true, min: 0, max: 100 },
    testsPassed: { type: Number, default: 0, min: 0 },
    totalTests: { type: Number, default: 0, min: 0 },
    attemptNumber: { type: Number, required: true, min: 1 },
    timeTaken: { type: Number, default: 0, min: 0 }, // seconds
    status: { type: String, enum: Object.values(SUBMISSION_STATUS), required: true },
    submittedAt: { type: Date, default: Date.now, index: true },

    isPerfect: { type: Boolean, default: false },
    exceededTimeLimit: { type: Boolean, default: false },
    xpEarned: { type: Number, default: 0, min: 0 },
    bonusXp: { type: Number, default: 0, min: 0 },
    baseXp: { type: Number, default: 0, min: 0 },
    isBestScore: { type: Boolean, default: false },
    improvement: { type: Number, default: 0 },

    categoryScores: {
      html: { earned: { type: Number, default: 0 }, max: { type: Number, default: 20 } },
      css: { earned: { type: Number, default: 0 }, max: { type: Number, default: 25 } },
      functionality: { earned: { type: Number, default: 0 }, max: { type: Number, default: 30 } },
      responsiveness: { earned: { type: Number, default: 0 }, max: { type: Number, default: 15 } },
      codeQuality: { earned: { type: Number, default: 0 }, max: { type: Number, default: 10 } },
    },
    testResults: { type: [testResultSchema], default: [] },
    verification: {
      provider: { type: String, default: 'client-sandbox' },
      serverVerifiedTests: { type: Number, default: 0 },
      sandboxVerifiedTests: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        ret.id = ret._id?.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

submissionSchema.index({ userId: 1, challengeId: 1, attemptNumber: 1 }, { unique: true });
submissionSchema.index({ userId: 1, submittedAt: -1 });
submissionSchema.index({ challengeId: 1, score: -1 });
submissionSchema.index({ status: 1, submittedAt: -1 });

/** History entry: challenge meta is attached by the service layer. */
submissionSchema.methods.toSummaryJSON = function toSummaryJSON({ challenge = null } = {}) {
  return {
    id: String(this._id),
    challengeId: String(this.challengeId),
    challenge: challenge
      ? { id: String(challenge._id ?? challenge.id), title: challenge.title, category: challenge.category, difficulty: challenge.difficulty, slug: challenge.slug }
      : null,
    score: this.score,
    testsPassed: this.testsPassed,
    totalTests: this.totalTests,
    attemptNumber: this.attemptNumber,
    timeTaken: this.timeTaken,
    status: this.status,
    isPerfect: this.isPerfect,
    xpEarned: this.xpEarned,
    bonusXp: this.bonusXp,
    isBestScore: this.isBestScore,
    submittedAt: this.submittedAt,
  };
};

submissionSchema.methods.toDetailJSON = function toDetailJSON({ challenge = null, user = null } = {}) {
  return {
    ...this.toSummaryJSON({ challenge }),
    htmlCode: this.htmlCode,
    cssCode: this.cssCode,
    jsCode: this.jsCode,
    categoryScores: this.categoryScores,
    testResults: this.testResults,
    verification: this.verification,
    exceededTimeLimit: this.exceededTimeLimit,
    baseXp: this.baseXp,
    improvement: this.improvement,
    user: user ? { id: String(user._id ?? user.id), username: user.username, name: user.name, avatar: user.avatar } : null,
  };
};

const Submission = mongoose.models.Submission ?? mongoose.model('Submission', submissionSchema);

export default Submission;
