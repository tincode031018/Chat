const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 120, default: 'Cuộc họp mới' },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  passwordHash: { type: String, select: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  waitingRoom: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  scheduledAt: { type: Date, default: null },
  status: { type: String, enum: ['scheduled', 'active', 'ended'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
