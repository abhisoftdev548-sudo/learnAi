'use strict';
const mongoose = require('mongoose');

const CATEGORIES = [
  'coding',
  'web-development',
  'ai-ml',
  'design',
  'communication',
  'presentation',
  'research',
  'team-activity',
  'custom',
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

/** Types of work a member can attach to a submission. */
const SUBMISSION_TYPES = ['github', 'liveUrl', 'linkedin', 'drive', 'image', 'file', 'text'];

const requirementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true, maxlength: 120 },
    type: { type: String, enum: SUBMISSION_TYPES, required: true },
    required: { type: Boolean, default: true },
    help: { type: String, default: '', maxlength: 300 },
    max_length: { type: Number, default: 2000 },
  },
  { _id: false }
);

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
    description: { type: String, required: true, maxlength: 5000 },
    instructions: { type: String, default: '', maxlength: 8000 },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'medium' },

    startAt: { type: Date, required: true },
    deadline: { type: Date, required: true, index: true },
    maxPoints: { type: Number, required: true, min: 1, max: 1000 },

    requirements: {
      type: [requirementSchema],
      default: [],
      validate: [(v) => v.length <= 10, 'At most 10 requirements'],
    },
    referenceLinks: {
      type: [String],
      default: [],
      validate: [(v) => v.length <= 10, 'At most 10 reference links'],
    },
    coverImage: { type: String, default: '' },

    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },

    allowLateSubmissions: { type: Boolean, default: false },
    allowResubmission: { type: Boolean, default: false },
    /** When an approved submission may be mirrored to the community feed. */
    communityVisibility: { type: String, enum: ['auto', 'private'], default: 'auto' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

challengeSchema.index({ status: 1, deadline: -1 });
challengeSchema.index({ title: 'text', description: 'text' });

/** Live status of a challenge relative to "now". */
challengeSchema.methods.timeState = function timeState(now = new Date()) {
  if (this.status !== 'published') return this.status;
  if (now < this.startAt) return 'not_started';
  if (now > this.deadline) return this.allowLateSubmissions ? 'active' : 'closed';
  return 'active';
};

module.exports = mongoose.model('Challenge', challengeSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.DIFFICULTIES = DIFFICULTIES;
module.exports.SUBMISSION_TYPES = SUBMISSION_TYPES;
