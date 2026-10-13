'use strict';
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'account_approved',
        'account_rejected',
        'account_suspended',
        'challenge_published',
        'challenge_deadline',
        'submission_reviewed',
        'submission_needs_changes',
        'submission_rejected',
        'event_published',
        'event_reminder',
        'event_cancelled',
        'poll_opened',
        'poll_closed',
        'post_liked',
        'post_commented',
        'report_resolved',
        'points_awarded',
        'general',
      ],
    },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: '', maxlength: 500 },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
