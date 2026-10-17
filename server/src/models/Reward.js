'use strict';
const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceType: { type: String, enum: ['poll', 'event'], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    points: { type: Number, required: true, min: 0, max: 10000 },
    feedback: { type: String, default: '', maxlength: 3000 },
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

rewardSchema.index({ member: 1, sourceType: 1, sourceId: 1 }, { unique: true });

module.exports = mongoose.model('Reward', rewardSchema);
