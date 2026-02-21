const Notification = require('../models/Notification');
const Group = require('../models/Group');
const User = require('../models/User');

const listMy = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
      $or: [
        { type: 'group_invite', status: 'pending' },
        { type: { $in: ['group_invite_accepted', 'group_invite_rejected', 'group_member_left'] } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('fromUserId', '_id name email')
      .populate('groupId', '_id name')
      .lean();
    res.json(notifications);
  } catch (err) {
    next(err);
  }
};

const acceptInvite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      _id: id,
      userId: req.user._id,
      type: 'group_invite',
      status: 'pending',
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or already handled' });
    }
    const group = await Group.findById(notification.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.members.some((m) => m.toString() === req.user._id.toString())) {
      await Notification.findByIdAndUpdate(id, { status: 'accepted', read: true });
      return res.json({ group, alreadyMember: true });
    }
    group.members.push(req.user._id);
    await group.save();
    await Notification.findByIdAndUpdate(id, { status: 'accepted', read: true });
    const populated = await Group.findById(group._id)
      .populate('members', '_id name email')
      .populate('createdBy', '_id name email')
      .lean();
    const io = req.app.get('io');
    if (io) {
      const userDoc = await User.findById(req.user._id).select('_id name email').lean();
      io.to(`group:${group._id}`).emit('group_member_joined', {
        groupId: group._id,
        user: userDoc,
      });
    }
    const creatorId = group.createdBy?.toString?.() || group.createdBy;
    if (creatorId && creatorId !== req.user._id.toString()) {
      const creatorNotif = await Notification.create({
        userId: creatorId,
        type: 'group_invite_accepted',
        fromUserId: req.user._id,
        groupId: group._id,
        message: `${req.user.name} accepted "${group.name}" group join request`,
      });
      const io2 = req.app.get('io');
      if (io2) {
        const fromUser = await User.findById(req.user._id).select('_id name email').lean();
        io2.to(`user:${creatorId}`).emit('new_notification', {
          _id: creatorNotif._id,
          type: 'group_invite_accepted',
          fromUserId: fromUser,
          groupId: { _id: group._id, name: group.name },
          message: creatorNotif.message,
          createdAt: creatorNotif.createdAt,
        });
      }
    }
    res.json({ group: populated });
  } catch (err) {
    next(err);
  }
};

const declineInvite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      _id: id,
      userId: req.user._id,
      type: 'group_invite',
      status: 'pending',
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or already handled' });
    }
    const group = await Group.findById(notification.groupId).select('name createdBy').lean();
    const creatorId = group?.createdBy?.toString?.() || group?.createdBy;
    if (creatorId && group) {
      const creatorNotif = await Notification.create({
        userId: creatorId,
        type: 'group_invite_rejected',
        fromUserId: req.user._id,
        groupId: notification.groupId,
        message: `${req.user.name} rejected ${group.name} group chat invitation`,
      });
      const io = req.app.get('io');
      if (io) {
        const fromUser = await User.findById(req.user._id).select('_id name email').lean();
        io.to(`user:${creatorId}`).emit('new_notification', {
          _id: creatorNotif._id,
          type: 'group_invite_rejected',
          fromUserId: fromUser,
          groupId: { _id: group._id, name: group.name },
          message: creatorNotif.message,
          createdAt: creatorNotif.createdAt,
        });
      }
    }
    await Notification.findByIdAndUpdate(id, { status: 'declined', read: true });
    res.json({ message: 'Declined' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listMy, acceptInvite, declineInvite };
