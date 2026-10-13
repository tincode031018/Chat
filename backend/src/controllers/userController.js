const User = require('../models/User');
const { hashPassword, verifyPassword } = require('../services/authService');

async function search(req, res, next) {
  try {
    const username = String(req.query.username || '').trim();
    if (username.length < 2) return res.json([]);
    const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      username: { $regex: escapedUsername, $options: 'i' },
      _id: { $ne: req.user._id }
    }).select('username avatar status').limit(10);
    return res.json(users);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const { email, phone, avatar, password, currentPassword } = req.body;
    const changes = {};
    if (email !== undefined) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Email không hợp lệ.' });
      changes.email = email;
    }
    if (phone !== undefined) changes.phone = String(phone).slice(0, 30);
    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || avatar.length > 2_000_000) return res.status(400).json({ message: 'Avatar không hợp lệ hoặc vượt quá giới hạn.' });
      changes.avatar = avatar;
    }
    if (password !== undefined) {
      if (String(password).length < 8 || String(password).length > 128) return res.status(400).json({ message: 'Mật khẩu mới cần từ 8 đến 128 ký tự.' });
      const userWithPassword = await User.findById(req.user._id).select('+passwordHash');
      if (!currentPassword || !(await verifyPassword(currentPassword, userWithPassword.passwordHash))) {
        return res.status(401).json({ message: 'Mật khẩu hiện tại không chính xác.' });
      }
      changes.passwordHash = await hashPassword(password);
    }
    const user = await User.findByIdAndUpdate(req.user._id, changes, { new: true, runValidators: true });
    return res.json({ user: { id: user.id, username: user.username, email: user.email, phone: user.phone, avatar: user.avatar, status: user.status } });
  } catch (error) {
    return next(error);
  }
}

module.exports = { search, update };
