const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');

const sendRequest = async (req, res, next) => {
  try {
    const fromUserId = req.user._id;
    const toUserId = req.params.userId;
    if (fromUserId.toString() === toUserId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }
    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    let request = await FriendRequest.findOne({
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    });
    if (request) {
      if (request.status === 'accepted') {
        return res.status(400).json({ message: 'Already friends' });
      }
      if (request.fromUserId.toString() === fromUserId.toString() && request.status === 'pending') {
        return res.status(400).json({ message: 'Friend request already sent' });
      }
      if (request.toUserId.toString() === fromUserId.toString() && request.status === 'pending') {
        return res.status(400).json({ message: 'They have already sent you a request. Accept it instead.' });
      }
    }
    request = await FriendRequest.create({
      fromUserId,
      toUserId,
      status: 'pending',
    });
    const notif = await Notification.create({
      userId: toUserId,
      type: 'friend_request',
      fromUserId,
      friendRequestId: request._id,
      message: `${req.user.name} sent you a friend request`,
    });
    const io = req.app.get('io');
    if (io) {
      const fromUser = await User.findById(fromUserId).select('_id name email profilePic').lean();
      io.to(`user:${toUserId}`).emit('new_notification', {
        _id: notif._id,
        type: 'friend_request',
        fromUserId: fromUser,
        friendRequestId: request._id,
        message: notif.message,
        createdAt: notif.createdAt,
        read: false,
      });
    }
    res.status(201).json({ request, message: 'Friend request sent' });
  } catch (err) {
    next(err);
  }
};

const acceptRequest = async (req, res, next) => {
  try {
    const requestId = req.params.requestId;
    const request = await FriendRequest.findById(requestId);
    if (!request || request.toUserId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already handled' });
    }
    request.status = 'accepted';
    await request.save();
    const notif = await Notification.create({
      userId: request.fromUserId,
      type: 'friend_request_accepted',
      fromUserId: req.user._id,
      message: `${req.user.name} accepted your friend request`,
    });
    const io = req.app.get('io');
    if (io) {
      const fromUser = await User.findById(req.user._id).select('_id name email profilePic').lean();
      io.to(`user:${request.fromUserId}`).emit('new_notification', {
        _id: notif._id,
        type: 'friend_request_accepted',
        fromUserId: fromUser,
        message: notif.message,
        createdAt: notif.createdAt,
        read: false,
      });
    }
    res.json({ request, message: 'Friend request accepted' });
  } catch (err) {
    next(err);
  }
};

const declineRequest = async (req, res, next) => {
  try {
    const requestId = req.params.requestId;
    const request = await FriendRequest.findById(requestId);
    if (!request || request.toUserId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already handled' });
    }
    request.status = 'rejected';
    await request.save();
    res.json({ message: 'Friend request declined' });
  } catch (err) {
    next(err);
  }
};

const listFriends = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const requests = await FriendRequest.find({
      status: 'accepted',
      $or: [{ fromUserId: userId }, { toUserId: userId }],
    }).lean();
    const friendIds = requests.map((r) => (r.fromUserId.toString() === userId.toString() ? r.toUserId : r.fromUserId));
    const friends = await User.find({ _id: { $in: friendIds } }).select('_id name email profilePic').lean();
    res.json(friends);
  } catch (err) {
    next(err);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const otherUserId = req.params.userId;
    if (userId.toString() === otherUserId) {
      return res.json({ status: 'self' });
    }
    const request = await FriendRequest.findOne({
      $or: [
        { fromUserId: userId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: userId },
      ],
    });
    if (!request) {
      return res.json({ status: 'none' });
    }
    if (request.status === 'accepted') {
      return res.json({ status: 'friends' });
    }
    if (request.fromUserId.toString() === userId.toString()) {
      return res.json({ status: 'pending_sent' });
    }
    return res.json({ status: 'pending_received' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendRequest,
  acceptRequest,
  declineRequest,
  listFriends,
  getStatus,
};
