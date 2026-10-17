'use strict';
const mongoose = require('mongoose');

const EVENT_CATEGORIES = [
  'dsa-practice',
  'coding-session',
  'web-development',
  'ai-workshop',
  'english-speaking',
  'group-discussion',
  'presentation',
  'project-review',
  'team-meeting',
  'other',
];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
    description: { type: String, required: true, maxlength: 5000 },
    hostName: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, enum: EVENT_CATEGORIES, required: true, index: true },

    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },

    platform: { type: String, trim: true, maxlength: 60, default: '' },
    meetingUrl: { type: String, default: '', maxlength: 500 },
    coverImage: { type: String, default: '' },
    /** Private events hide the meeting URL from non-registrants. */
    isPrivate: { type: Boolean, default: false },

    registrationDeadline: { type: Date, default: null },
    rewardPoints: { type: Number, default: 0, min: 0, max: 10000 },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
module.exports.EVENT_CATEGORIES = EVENT_CATEGORIES;

/** ------------------------------------------------------------------ */
const registrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['registered', 'attended', 'no_show'], default: 'registered' },
    registeredAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One registration per member per event.
registrationSchema.index({ event: 1, member: 1 }, { unique: true });

const EventRegistration = mongoose.model('EventRegistration', registrationSchema);
module.exports.EventRegistration = EventRegistration;
