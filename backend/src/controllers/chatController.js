const Message = require('../models/Message');

async function getMessages(req, res, next) {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 }).limit(100).populate('sender', 'username avatar');
    return res.json(messages.reverse());
  } catch (error) {
    return next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const roomId = String(req.body.roomId || '').trim();
    const content = String(req.body.content || '').trim();
    const type = req.body.type || 'text';
    const fileName = String(req.body.fileName || '').slice(0, 255);
    if (!roomId || roomId.length > 120 || !content || content.length > 2_500_000) {
      return res.status(400).json({ message: 'Phòng chat hoặc nội dung tin nhắn không hợp lệ.' });
    }
    if (!['text', 'image', 'file', 'voice'].includes(type)) {
      return res.status(400).json({ message: 'Loại tin nhắn không hợp lệ.' });
    }
    const message = await Message.create({ roomId, content, fileName, type, sender: req.user._id });
    await message.populate('sender', 'username avatar');
    req.app.get('io').to(roomId).emit('chat:message', message);
    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
}

module.exports = { getMessages, sendMessage };
