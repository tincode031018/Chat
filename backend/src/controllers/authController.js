const User = require('../models/User');
const { hashPassword, verifyPassword, createToken } = require('../services/authService');

async function register(req, res, next) {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(username) || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Tên đăng nhập phải có 3–32 ký tự; mật khẩu cần ít nhất 8 ký tự.' });
    }
    if (await User.exists({ username })) return res.status(409).json({ message: 'Tên đăng nhập đã được sử dụng.' });
    const user = await User.create({ username, passwordHash: await hashPassword(password), status: 'online' });
    return res.status(201).json({ token: createToken(user), user: { id: user.id, username: user.username } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Tên đăng nhập đã được sử dụng.' });
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const user = await User.findOne({ username }).select('+passwordHash');
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }
    user.status = 'online';
    await user.save();
    return res.json({
      token: createToken(user),
      user: { id: user.id, username: user.username, email: user.email, phone: user.phone, avatar: user.avatar, status: user.status }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login };
