const Group = require('../models/Group');
const User = require('../models/User');
const mongoose = require('mongoose');

async function list(req, res, next) {
  try {
    const groups = await Group.find({ members: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('members', 'username avatar status');
    return res.json(groups);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    if (!name || name.length > 80) return res.status(400).json({ message: 'Tên nhóm cần từ 1 đến 80 ký tự.' });
    const members = Array.isArray(req.body.members) ? req.body.members : [];
    if (members.length > 100) return res.status(400).json({ message: 'Nhóm không thể vượt quá 100 thành viên.' });
    const uniqueMembers = [...new Set([...members.map(String), req.user.id])];
    if (!uniqueMembers.every(mongoose.isValidObjectId)) return res.status(400).json({ message: 'Danh sách thành viên không hợp lệ.' });
    const validCount = await User.countDocuments({ _id: { $in: uniqueMembers } });
    if (validCount !== uniqueMembers.length) return res.status(400).json({ message: 'Một hoặc nhiều thành viên không tồn tại.' });
    const group = await Group.create({ name, avatar: String(req.body.avatar || '').slice(0, 2000), members: uniqueMembers, admins: [req.user._id], createdBy: req.user._id });
    return res.status(201).json(group);
  } catch (error) {
    return next(error);
  }
}

async function addMember(req, res, next) {
  try {
    const group = await Group.findById(req.body.groupId);
    if (!group) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });
    if (!group.admins.some(id => id.equals(req.user._id))) return res.status(403).json({ message: 'Chỉ quản trị viên mới có thể thêm thành viên.' });
    const member = await User.findOne({ username: String(req.body.username || '').trim() });
    if (!member) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    if (!group.members.some(id => id.equals(member._id))) {
      if (group.members.length >= 100) return res.status(400).json({ message: 'Nhóm đã đạt giới hạn 100 thành viên.' });
      group.members.push(member._id);
      await group.save();
    }
    return res.json(await group.populate('members', 'username avatar status'));
  } catch (error) {
    return next(error);
  }
}

module.exports = { list, create, addMember };
