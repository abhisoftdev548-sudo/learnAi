import mongoose from 'mongoose';
import { ACHIEVEMENT_CRITERIA, CATEGORIES } from '../config/constants.js';

/**
 * Achievement catalogue. Criteria are declarative so the achievement service can
 * evaluate them against live user statistics after every relevant action.
 */
const achievementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, default: 'award' },
    tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    category: { type: String, enum: [...CATEGORIES, 'General'], default: 'General' },
    xpReward: { type: Number, default: 0, min: 0 },
    order: { type: Number, default: 0 },
    hidden: { type: Boolean, default: false },
    criteria: {
      type: {
        type: String,
        enum: Object.values(ACHIEVEMENT_CRITERIA),
        required: true,
      },
      threshold: { type: Number, default: 1, min: 0 },
      category: { type: String, enum: CATEGORIES, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        ret.id = ret._id?.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

const Achievement = mongoose.models.Achievement ?? mongoose.model('Achievement', achievementSchema);

export default Achievement;
