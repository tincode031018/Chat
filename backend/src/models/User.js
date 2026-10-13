const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 32 },
  passwordHash: { type: String, required: true, select: false },
  email: { type: String, trim: true, lowercase: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  avatar: { type: String, default: '' },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
