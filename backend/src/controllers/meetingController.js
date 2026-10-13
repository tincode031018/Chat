const bcrypt = require('bcryptjs');
const Meeting = require('../models/Meeting');

async function create(req, res, next) {
  try {
    const title = String(req.body.title || 'Cuộc họp mới').trim();
    const password = String(req.body.password || '');
    if (title.length > 120 || password.length > 128) return res.status(400).json({ message: 'Thông tin cuộc họp không hợp lệ.' });
    const meeting = await Meeting.create({
      title: title || 'Cuộc họp mới',
      host: req.user._id,
      participants: [req.user._id],
      passwordHash: password ? await bcrypt.hash(password, 12) : undefined,
      scheduledAt: req.body.scheduledAt || undefined
    });
    return res.status(201).json({ id: meeting.id, title: meeting.title, status: meeting.status });
  } catch (error) {
    return next(error);
  }
}

async function join(req, res, next) {
  try {
    const meeting = await Meeting.findById(req.body.meetingId).select('+passwordHash');
    if (!meeting || meeting.status === 'ended') return res.status(404).json({ message: 'Không tìm thấy cuộc họp đang hoạt động.' });
    if (meeting.passwordHash && !(await bcrypt.compare(String(req.body.password || ''), meeting.passwordHash))) {
      return res.status(401).json({ message: 'Mật khẩu cuộc họp không chính xác.' });
    }
    const isHost = meeting.host.equals(req.user._id);
    if (!isHost && !meeting.participants.some(id => id.equals(req.user._id)) && !meeting.waitingRoom.some(id => id.equals(req.user._id))) {
      meeting.waitingRoom.push(req.user._id);
      await meeting.save();
      return res.status(202).json({ status: 'waiting', meetingId: meeting.id, message: 'Bạn đang ở phòng chờ; host cần cho phép tham gia.' });
    }
    return res.json({ status: 'joined', meetingId: meeting.id, title: meeting.title });
  } catch (error) {
    return next(error);
  }
}

module.exports = { create, join };
