const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const hashPassword = password => bcrypt.hash(password, 12);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
const createToken = user => jwt.sign(
  { sub: user._id.toString(), username: user.username },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

module.exports = { hashPassword, verifyPassword, createToken };
