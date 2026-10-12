import mongoose from 'mongoose';
export default mongoose.model('Team', new mongoose.Schema({
  name: { type: String, required: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '', maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true }));
