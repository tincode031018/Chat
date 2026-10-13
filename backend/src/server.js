require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const User = require('./models/User');
const logger = require('./config/logger');

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
  }
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connectf');
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:8080' } });
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
    socket.on('chat:join', roomId => {
      if (typeof roomId === 'string' && roomId.length <= 120) socket.join(roomId);
    });
  });

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, () => logger.info('ConnectF API listening', { port }));
}

start().catch(error => {
  logger.error('Failed to start ConnectF API', { message: error.message, stack: error.stack });
  process.exitCode = 1;
});
