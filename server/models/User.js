import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  username: { type: String, required: true, lowercase: true, unique: true, maxlength: 30 },
  email: { type: String, required: true, lowercase: true, unique: true, select: false },
  password: { type: String, required: true, select: false },
  avatar: { type: String, default: '' }, bio: { type: String, default: '', maxlength: 500 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  xp: { type: Number, default: 0, min: 0 }, level: { type: Number, default: 1 },
  totalScore: { type: Number, default: 0 }, submissionCount: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 }, challengesSolved: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 }, longestStreak: { type: Number, default: 0 },
  lastPracticeDate: { type: Date, default: null },
  categorySolved: { HTML: { type: Number, default: 0 }, CSS: { type: Number, default: 0 }, JavaScript: { type: Number, default: 0 } },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
  tokenVersion: { type: Number, default: 0, select: false },
  submissionLock: { type: Number, default: 0, select: false },
}, { timestamps: true });
schema.index({ xp: -1, challengesSolved: -1 });
schema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
export default mongoose.model('User', schema);
