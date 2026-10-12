import mongoose from 'mongoose';
const testSchema = new mongoose.Schema({
  label: { type: String, required: true },
  type: { type: String, enum: ['html-selector', 'html-attribute', 'css-declaration', 'js-node', 'js-call'], required: true },
  group: { type: String, enum: ['structure', 'layout', 'functionality', 'responsive', 'quality'], required: true },
  selector: String, attribute: String, expected: String, property: String,
  media: String, nodeType: String, callee: String,
  minCount: { type: Number, default: 1, min: 1 },
}, { _id: false });
const schema = new mongoose.Schema({
  slug: { type: String, unique: true, sparse: true },
  title: { type: String, required: true }, description: { type: String, required: true },
  category: { type: String, enum: ['HTML', 'CSS', 'JavaScript'], required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  instructions: { type: [String], required: true },
  starterHTML: { type: String, default: '' }, starterCSS: { type: String, default: '' }, starterJS: { type: String, default: '' },
  testCases: { type: [testSchema], required: true, select: false },
  maxAttempts: { type: Number, default: 10, min: 1 },
  timeLimit: { type: Number, default: 1800, min: 1 },
  xp: { type: Number, required: true, min: 0 }, hints: { type: [String], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submissionCount: { type: Number, default: 0 }, solvedCount: { type: Number, default: 0 }, totalScore: { type: Number, default: 0 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ deletedAt: 1, category: 1, difficulty: 1, createdAt: -1 });
export default mongoose.model('Challenge', schema);
