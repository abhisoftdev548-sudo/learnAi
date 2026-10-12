import mongoose from 'mongoose';
export default mongoose.model('Achievement', new mongoose.Schema({
  key: { type: String, required: true, unique: true }, name: { type: String, required: true }, description: String,
  metric: { type: String, enum: ['challengesSolved', 'bestScore', 'longestStreak', 'CSS', 'JavaScript'], required: true },
  threshold: { type: Number, required: true, min: 1 },
}, { timestamps: true }));
