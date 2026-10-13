'use strict';
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 4000 },

    kind: { type: String, enum: ['manual', 'submission'], default: 'manual' },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', default: null },
    submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', default: null },

    links: {
      type: [{ label: { type: String, maxlength: 60 }, url: { type: String, maxlength: 500 } }],
      default: [],
      validate: [(v) => v.length <= 6, 'At most 6 links'],
    },
    images: {
      type: [String],
      default: [],
      validate: [(v) => v.length <= 6, 'At most 6 images'],
    },

    likeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: ['visible', 'removed'], default: 'visible', index: true },
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    removedReason: { type: String, default: '' },
    /** true when auto-published from an approved challenge submission. */
    fromSubmission: { type: Boolean, default: false },
  },
  { timestamps: true }
);

postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ title: 'text', body: 'text' });

const Post = mongoose.model('Post', postSchema);
module.exports = { Post };

/** ------------------------------------------------------------------ */
const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
    status: { type: String, enum: ['visible', 'removed'], default: 'visible', index: true },
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });

const Comment = mongoose.model('Comment', commentSchema);
module.exports.Comment = Comment;

/** ------------------------------------------------------------------ */
const likeSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Hard guarantee: one like per user per post.
likeSchema.index({ post: 1, user: 1 }, { unique: true });

const Like = mongoose.model('Like', likeSchema);
module.exports.Like = Like;

/** ------------------------------------------------------------------ */
const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['post', 'comment'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 500 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNote: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });

const Report = mongoose.model('Report', reportSchema);
module.exports.Report = Report;
