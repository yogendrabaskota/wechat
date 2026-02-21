const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const Notification = require('../models/Notification');
const User = require('../models/User');

const listMy = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', '_id name email')
      .populate('createdBy', '_id name email')
      .populate('admins', '_id name email')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(groups);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, memberIds } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    const group = await Group.create({
      name: name.trim(),
      createdBy: req.user._id,
      members: [req.user._id],
      admins: [req.user._id],
    });
    const ids = Array.isArray(memberIds) ? memberIds : [];
    const inviteeIds = [];
    for (const id of ids) {
      if (id && id !== req.user._id.toString()) {
        const exists = await User.findById(id);
        if (exists) inviteeIds.push(id);
      }
    }
    const io = req.app.get('io');
    for (const userId of inviteeIds) {
      const notif = await Notification.create({
        userId,
        type: 'group_invite',
        fromUserId: req.user._id,
        groupId: group._id,
        message: `${req.user.name} invited you to join "${name.trim()}"`,
      });
      if (io) {
        io.to(`user:${userId}`).emit('new_notification', {
          _id: notif._id,
          type: 'group_invite',
          fromUserId: { _id: req.user._id, name: req.user.name, email: req.user.email },
          groupId: { _id: group._id, name: group.name },
          message: notif.message,
          createdAt: notif.createdAt,
        });
      }
    }
    const populated = await Group.findById(group._id)
      .populate('members', '_id name email')
      .populate('createdBy', '_id name email')
      .populate('admins', '_id name email')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const userId = req.user._id.toString();
    const isMember = group.members.some((m) => m.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }
    const adminIds = (group.admins && group.admins.length)
      ? group.admins.map((a) => a.toString())
      : [group.createdBy.toString()];
    const isAdmin = adminIds.includes(userId);
    if (isAdmin && adminIds.length === 1) {
      return res.status(400).json({
        message: 'Promote another member to admin before leaving',
      });
    }
    const leavingUser = await User.findById(req.user._id).select('name').lean();
    const leavingName = leavingUser?.name || 'Someone';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const systemText = `${leavingName} left the group at ${timeStr}`;
    const systemMsg = await GroupMessage.create({
      groupId: group._id,
      senderId: null,
      text: systemText,
      type: 'system',
    });
    const remainingMemberIds = group.members.filter((m) => m.toString() !== userId).map((m) => m.toString());
    const io = req.app.get('io');
    const fromUser = await User.findById(req.user._id).select('_id name email').lean();
    for (const memberId of remainingMemberIds) {
      const notif = await Notification.create({
        userId: memberId,
        type: 'group_member_left',
        fromUserId: req.user._id,
        groupId: group._id,
        message: `${leavingName} left the group`,
      });
      if (io) {
        io.to(`user:${memberId}`).emit('new_notification', {
          _id: notif._id,
          type: 'group_member_left',
          fromUserId: fromUser,
          groupId: { _id: group._id, name: group.name },
          message: notif.message,
          createdAt: notif.createdAt,
        });
      }
    }
    const systemMsgPopulated = await GroupMessage.findById(systemMsg._id).lean();
    if (io) {
      io.to(`group:${group._id}`).emit('new_group_message', { ...systemMsgPopulated, senderId: null });
    }
    group.members = group.members.filter((m) => m.toString() !== userId);
    if (group.admins) {
      group.admins = group.admins.filter((a) => a.toString() !== userId);
    }
    await group.save();
    if (io) {
      io.to(`group:${group._id}`).emit('group_member_left', { groupId: group._id, userId });
    }
    res.json({ message: 'Left the group' });
  } catch (err) {
    next(err);
  }
};

const promoteToAdmin = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const currentUserId = req.user._id.toString();
    const adminIds = (group.admins && group.admins.length)
      ? group.admins.map((a) => a.toString())
      : [group.createdBy.toString()];
    const isAdmin = adminIds.includes(currentUserId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can promote members' });
    }
    const targetUserId = req.params.userId;
    const isMember = group.members.some((m) => m.toString() === targetUserId);
    if (!isMember) {
      return res.status(400).json({ message: 'User is not a member of this group' });
    }
    const alreadyAdmin = adminIds.includes(targetUserId);
    if (alreadyAdmin) {
      return res.status(400).json({ message: 'User is already an admin' });
    }
    if (!group.admins || !group.admins.length) {
      group.admins = [group.createdBy];
    }
    if (!group.admins.some((a) => a.toString() === targetUserId)) {
      group.admins.push(targetUserId);
    }
    await group.save();
    const populated = await Group.findById(group._id)
      .populate('members', '_id name email')
      .populate('createdBy', '_id name email')
      .populate('admins', '_id name email')
      .lean();
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', '_id name email')
      .populate('createdBy', '_id name email')
      .populate('admins', '_id name email')
      .lean();
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isMember = group.members.some((m) => m._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }
    res.json(group);
  } catch (err) {
    next(err);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }
    const messages = await GroupMessage.find({ groupId: group._id })
      .sort({ createdAt: 1 })
      .populate('senderId', '_id name')
      .lean();
    res.json(messages);
  } catch (err) {
    next(err);
  }
};

const unsendGroupMessage = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }
    const groupMessage = await GroupMessage.findById(req.params.messageId);
    if (!groupMessage || groupMessage.groupId.toString() !== group._id.toString()) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (groupMessage.type === 'system') {
      return res.status(400).json({ message: 'Cannot unsend system messages' });
    }
    if (groupMessage.senderId && groupMessage.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only unsend your own messages' });
    }
    if (groupMessage.deleted) {
      return res.status(400).json({ message: 'Message already unsent' });
    }
    groupMessage.deleted = true;
    groupMessage.deletedAt = new Date();
    await groupMessage.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${group._id}`).emit('message_unsent', { messageId: groupMessage._id });
    }
    res.json({ message: 'Message unsent' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listMy, create, getOne, getMessages, leaveGroup, promoteToAdmin, unsendGroupMessage };
