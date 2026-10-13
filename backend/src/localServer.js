const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID, randomBytes } = require('crypto');
const { Server } = require('socket.io');
const logger = require('./config/logger');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = Number(process.env.PORT) || 8081;
const dataDirectory = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDirectory, 'connectf-local.json');
const secretFile = path.join(dataDirectory, 'local-secret');
const frontendDirectory = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const defaultStore = { users: [], messages: [], meetings: [], groups: [] };

fs.mkdirSync(dataDirectory, { recursive: true });
if (!process.env.JWT_SECRET) {
  if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, randomBytes(48).toString('base64'), { encoding: 'ascii', mode: 0o600 });
  process.env.JWT_SECRET = fs.readFileSync(secretFile, 'ascii').trim();
}
if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(defaultStore, null, 2), 'utf8');

function readStore() {
  return { ...defaultStore, ...JSON.parse(fs.readFileSync(dataFile, 'utf8')) };
}

function writeStore(store) {
  const temporaryFile = `${dataFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(temporaryFile, dataFile);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email || '',
    phone: user.phone || '',
    avatar: user.avatar || '',
    status: user.status || 'offline'
  };
}

function createToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Yêu cầu đăng nhập.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const store = readStore();
    const user = store.users.find(candidate => candidate.id === payload.sub);
    if (!user) return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ.' });
    req.user = user;
    req.store = store;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn.' });
    }
    return next(error);
  }
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '3mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'connectf-local', version: '2026-10-12-interactions-1' }));

app.post(['/auth/register', '/api/auth/register'], async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(username) || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Tên đăng nhập phải có 3–32 ký tự; mật khẩu cần ít nhất 8 ký tự.' });
    }
    const store = readStore();
    if (store.users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ message: 'Tên đăng nhập đã được sử dụng.' });
    }
    const user = {
      id: randomUUID(),
      username,
      passwordHash: await bcrypt.hash(password, 12),
      email: '',
      phone: '',
      avatar: '',
      status: 'online',
      createdAt: new Date().toISOString()
    };
    store.users.push(user);
    writeStore(store);
    return res.status(201).json({ token: createToken(user), user: { id: user.id, username: user.username } });
  } catch (error) {
    return next(error);
  }
});

app.post(['/auth/login', '/api/auth/login'], async (req, res, next) => {
  try {
    const store = readStore();
    const username = String(req.body.username || '').trim();
    const user = store.users.find(candidate => candidate.username.toLowerCase() === username.toLowerCase());
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }
    user.status = 'online';
    writeStore(store);
    return res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.get(['/chat/:roomId', '/api/chat/:roomId'], authenticate, (req, res) => {
  const messages = req.store.messages.filter(message => message.roomId === req.params.roomId).slice(-100);
  return res.json(messages.map(message => ({
    ...message,
    sender: publicUser(req.store.users.find(user => user.id === message.senderId) || { id: message.senderId, username: 'Người dùng' })
  })));
});

app.post(['/chat/send', '/api/chat/send'], authenticate, (req, res) => {
  const roomId = String(req.body.roomId || '').trim();
  const content = String(req.body.content || '').trim();
  const type = req.body.type || 'text';
  if (!roomId || roomId.length > 120 || !content || content.length > 2_500_000) {
    return res.status(400).json({ message: 'Phòng chat hoặc nội dung tin nhắn không hợp lệ.' });
  }
  if (!['text', 'image', 'file', 'voice'].includes(type)) {
    return res.status(400).json({ message: 'Loại tin nhắn không hợp lệ.' });
  }
  const message = {
    _id: randomUUID(),
    roomId,
    senderId: req.user.id,
    sender: publicUser(req.user),
    content,
    fileName: String(req.body.fileName || '').slice(0, 255),
    type,
    createdAt: new Date().toISOString()
  };
  req.store.messages.push(message);
  writeStore(req.store);
  io.to(roomId).emit('chat:message', message);
  return res.status(201).json(message);
});

app.post(['/meeting/create', '/api/meeting/create'], authenticate, async (req, res, next) => {
  try {
    const title = String(req.body.title || 'Cuộc họp mới').trim();
    const password = String(req.body.password || '');
    if (title.length > 120 || password.length > 128) return res.status(400).json({ message: 'Thông tin cuộc họp không hợp lệ.' });
    const meeting = {
      id: randomUUID(),
      title: title || 'Cuộc họp mới',
      hostId: req.user.id,
      passwordHash: password ? await bcrypt.hash(password, 12) : '',
      participants: [req.user.id],
      waitingRoom: [],
      scheduledAt: req.body.scheduledAt || null,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    req.store.meetings.push(meeting);
    writeStore(req.store);
    return res.status(201).json({ id: meeting.id, title: meeting.title, status: meeting.status });
  } catch (error) {
    return next(error);
  }
});

app.post(['/meeting/join', '/api/meeting/join'], authenticate, async (req, res, next) => {
  try {
    const meeting = req.store.meetings.find(candidate => candidate.id === String(req.body.meetingId || ''));
    if (!meeting || meeting.status === 'ended') return res.status(404).json({ message: 'Không tìm thấy cuộc họp đang hoạt động.' });
    if (meeting.passwordHash && !(await bcrypt.compare(String(req.body.password || ''), meeting.passwordHash))) {
      return res.status(401).json({ message: 'Mật khẩu cuộc họp không chính xác.' });
    }
    if (meeting.hostId !== req.user.id && !meeting.participants.includes(req.user.id)) {
      if (!meeting.waitingRoom.includes(req.user.id)) meeting.waitingRoom.push(req.user.id);
      writeStore(req.store);
      return res.status(202).json({ status: 'waiting', meetingId: meeting.id, message: 'Bạn đang ở phòng chờ; host cần cho phép tham gia.' });
    }
    return res.json({ status: 'joined', meetingId: meeting.id, title: meeting.title });
  } catch (error) {
    return next(error);
  }
});

app.put(['/user/update', '/api/user/update'], authenticate, async (req, res, next) => {
  try {
    const { email, phone, avatar, password, currentPassword } = req.body;
    if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ.' });
    }
    if (email !== undefined) req.user.email = email;
    if (phone !== undefined) req.user.phone = String(phone).slice(0, 30);
    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || avatar.length > 2_000_000) return res.status(400).json({ message: 'Avatar không hợp lệ hoặc vượt quá giới hạn.' });
      req.user.avatar = avatar;
    }
    if (password !== undefined) {
      if (String(password).length < 8 || String(password).length > 128) return res.status(400).json({ message: 'Mật khẩu mới cần từ 8 đến 128 ký tự.' });
      if (!currentPassword || !(await bcrypt.compare(String(currentPassword), req.user.passwordHash))) {
        return res.status(401).json({ message: 'Mật khẩu hiện tại không chính xác.' });
      }
      req.user.passwordHash = await bcrypt.hash(password, 12);
    }
    writeStore(req.store);
    return res.json({ user: publicUser(req.user) });
  } catch (error) {
    return next(error);
  }
});

app.get(['/user/search', '/api/user/search'], authenticate, (req, res) => {
  const username = String(req.query.username || '').trim();
  if (username.length < 2) return res.json([]);
  const matches = req.store.users
    .filter(user => user.id !== req.user.id && user.username.toLowerCase().includes(username.toLowerCase()))
    .slice(0, 10)
    .map(publicUser);
  return res.json(matches);
});

app.get(['/group/list', '/api/group/list'], authenticate, (req, res) => {
  const groups = req.store.groups
    .filter(group => group.members.includes(req.user.id))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(group => ({
      ...group,
      members: group.members.map(id => publicUser(req.store.users.find(user => user.id === id) || { id, username: 'Người dùng' }))
    }));
  return res.json(groups);
});

app.post(['/group/create', '/api/group/create'], authenticate, (req, res) => {
  const name = String(req.body.name || '').trim();
  const requestedMembers = Array.isArray(req.body.members) ? req.body.members.map(String) : [];
  if (!name || name.length > 80) return res.status(400).json({ message: 'Tên nhóm cần từ 1 đến 80 ký tự.' });
  if (requestedMembers.length > 100) return res.status(400).json({ message: 'Nhóm không thể vượt quá 100 thành viên.' });
  const members = [...new Set([...requestedMembers, req.user.id])];
  if (!members.every(id => req.store.users.some(user => user.id === id))) {
    return res.status(400).json({ message: 'Một hoặc nhiều thành viên không tồn tại.' });
  }
  const group = {
    _id: randomUUID(),
    name,
    avatar: String(req.body.avatar || '').slice(0, 2000),
    members,
    admins: [req.user.id],
    createdBy: req.user.id,
    createdAt: new Date().toISOString()
  };
  req.store.groups.push(group);
  writeStore(req.store);
  return res.status(201).json(group);
});

app.post(['/group/addMember', '/api/group/addMember'], authenticate, (req, res) => {
  const group = req.store.groups.find(candidate => candidate._id === String(req.body.groupId || ''));
  if (!group) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });
  if (!group.admins.includes(req.user.id)) return res.status(403).json({ message: 'Chỉ quản trị viên mới có thể thêm thành viên.' });
  const member = req.store.users.find(candidate => candidate.username.toLowerCase() === String(req.body.username || '').trim().toLowerCase());
  if (!member) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
  if (!group.members.includes(member.id)) {
    if (group.members.length >= 100) return res.status(400).json({ message: 'Nhóm đã đạt giới hạn 100 thành viên.' });
    group.members.push(member.id);
    writeStore(req.store);
  }
  return res.json({
    ...group,
    members: group.members.map(id => publicUser(req.store.users.find(user => user.id === id) || { id, username: 'Người dùng' }))
  });
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = readStore().users.find(candidate => candidate.id === payload.sub);
    if (!user) return next(new Error('Unauthorized'));
    socket.userId = user.id;
    return next();
  } catch (error) {
    return next(error);
  }
});

io.on('connection', socket => {
  socket.on('chat:join', roomId => {
    if (typeof roomId === 'string' && roomId.length <= 120) socket.join(roomId);
  });
});

app.use(express.static(frontendDirectory));
app.get('*', (_req, res) => res.sendFile(path.join(frontendDirectory, 'index.html')));
app.use((error, _req, res, _next) => {
  logger.error('Local request failed', { message: error.message, stack: error.stack });
  return res.status(500).json({ message: 'Đã có lỗi máy chủ local.' });
});

server.listen(port, '127.0.0.1', () => {
  logger.info('ConnectF offline mode listening', { port, dataFile });
});
