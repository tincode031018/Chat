const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 2500000 },
  fileName: { type: String, maxlength: 255, default: '' },
  type: { type: String, enum: ['text', 'image', 'file', 'voice'], default: 'text' }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
