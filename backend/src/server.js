require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const User = require('./models/User');
const Group = require('./models/Group');
const { isDirectChatParticipant } = require('./services/chatRoomAccess');
const getClientOrigins = require('./config/clientOrigins');
const logger = require('./config/logger');

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
  }
  const mongoUri = process.env.MONGODB_URI || (process.env.NODE_ENV === 'production' ? '' : 'mongodb://localhost:27017/connectf');
  if (!mongoUri) throw new Error('MONGODB_URI must be set in production.');
  await mongoose.connect(mongoUri);
  const server = http.createServer(app);
  const clientOrigins = getClientOrigins();
  const io = new Server(server, { cors: { origin: clientOrigins } });
  app.set('io', io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Unauthorized'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub).select('_id username');
      if (!user) return next(new Error('Unauthorized'));
      socket.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  });

  io.on('connection', socket => {
    socket.on('chat:join', async roomId => {
      try {
        if (typeof roomId !== 'string' || roomId.length > 120) {
          socket.emit('chat:error', { message: 'Mã cuộc trò chuyện không hợp lệ.' });
          return;
        }
        const directMember = isDirectChatParticipant(socket.user.id, roomId);
        const groupMember = !directMember && /^[a-f\d]{24}$/i.test(roomId)
          ? await Group.exists({ _id: roomId, members: socket.user._id })
          : false;
        if (directMember || groupMember) socket.join(roomId);
        else socket.emit('chat:error', { message: 'Bạn không có quyền truy cập cuộc trò chuyện này.' });
      } catch (error) {
        logger.error('Socket room authorization failed', { message: error.message });
        socket.emit('chat:error', { message: 'Không thể xác minh quyền truy cập cuộc trò chuyện.' });
      }
    });
  });

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, () => logger.info('ConnectF API listening', { port }));
}

start().catch(error => {
  logger.error('Failed to start ConnectF API', { message: error.message, stack: error.stack });
  process.exitCode = 1;
});
