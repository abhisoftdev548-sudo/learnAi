import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  category: { type: String, enum: ['HTML', 'CSS', 'JavaScript'], required: true },
  htmlCode: { type: String, default: '', select: false }, cssCode: { type: String, default: '', select: false }, jsCode: { type: String, default: '', select: false },
  score: { type: Number, min: 0, max: 100, required: true }, testsPassed: Number, totalTests: Number,
  attemptNumber: { type: Number, required: true }, timeTaken: Number,
  status: { type: String, enum: ['passed', 'failed', 'partial'], required: true },
  xpEarned: { type: Number, default: 0 }, firstSolve: { type: Boolean, default: false },
  testResults: [{ _id: false, label: String, passed: Boolean }],
  evaluationMode: { type: String, default: 'static-v1' },
  submittedAt: { type: Date, default: Date.now },
});
schema.index({ userId: 1, challengeId: 1, attemptNumber: 1 }, { unique: true });
schema.index({ userId: 1, submittedAt: -1 });
schema.index({ submittedAt: -1, userId: 1 });
schema.index({ challengeId: 1, status: 1 });
export default mongoose.model('Submission', schema);
