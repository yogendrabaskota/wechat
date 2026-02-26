const jwt = require('jsonwebtoken');
const { redisClient } = require('../config/redis');
const Message = require('../models/Message');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const Notification = require('../models/Notification');
const User = require('../models/User');

const ONLINE_KEY = 'chat:online';
const CONV_CACHE_PREFIX = 'chat:conv:';

const getOnlineUsers = async () => {
  try {
    const ids = await redisClient.sMembers(ONLINE_KEY);
    return ids;
  } catch {
    return [];
  }
};

const setUserOnline = async (userId) => {
  try {
    await redisClient.sAdd(ONLINE_KEY, userId.toString());
  } catch (err) {
    console.error('Redis setUserOnline:', err.message);
  }
};

const setUserOffline = async (userId) => {
  try {
    await redisClient.sRem(ONLINE_KEY, userId.toString());
  } catch (err) {
    console.error('Redis setUserOffline:', err.message);
  }
};

const cacheConversation = async (userId, data) => {
  try {
    const key = `${CONV_CACHE_PREFIX}${userId}`;
    await redisClient.setEx(key, 300, JSON.stringify(data));
  } catch (err) {
    console.error('Redis cacheConversation:', err.message);
  }
};

const setupSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.match(/token=([^;]+)/)?.[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId.toString();
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    await setUserOnline(socket.userId);
    socket.join(`user:${socket.userId}`);

    const userGroups = await Group.find({ members: socket.userId }).select('_id').lean();
    userGroups.forEach((g) => socket.join(`group:${g._id}`));

    const onlineIds = await getOnlineUsers();
    io.emit('user_online', { userId: socket.userId, onlineIds });

    socket.on('disconnect', async () => {
      await setUserOffline(socket.userId);
      const onlineIds = await getOnlineUsers();
      io.emit('user_offline', { userId: socket.userId, onlineIds });
    });

    socket.on('send_message', async (payload) => {
      try {
        const { receiverId, text, conversationId } = payload;
        if (!receiverId || !text?.trim()) return;
        const message = await Message.create({
          senderId: socket.userId,
          receiverId,
          conversationId,
          text: text.trim(),
        });
        const populated = await Message.findById(message._id)
          .populate('senderId', '_id name profilePic')
          .populate('receiverId', '_id name profilePic')
          .lean();
        io.to(`user:${receiverId}`).emit('new_message', populated);
        socket.emit('new_message', populated);

        const textSnippet = text.trim().length > 50 ? text.trim().slice(0, 50) + '...' : text.trim();
        const notif = await Notification.create({
          userId: receiverId,
          type: 'message',
          fromUserId: socket.userId,
          message: textSnippet ? `${populated.senderId?.name || 'Someone'} sent you a message: ${textSnippet}` : `${populated.senderId?.name || 'Someone'} sent you a message`,
        });
        const fromUser = await User.findById(socket.userId).select('_id name email profilePic').lean();
        io.to(`user:${receiverId}`).emit('new_notification', {
          _id: notif._id,
          type: 'message',
          fromUserId: fromUser,
          message: notif.message,
          createdAt: notif.createdAt,
          read: false,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message_seen', async (payload) => {
      try {
        const { messageId, receiverId } = payload;
        if (!messageId) return;
        await Message.findByIdAndUpdate(messageId, { seen: true });
        if (receiverId) {
          io.to(`user:${receiverId}`).emit('message_seen', { messageId });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('typing_start', (payload) => {
      const { receiverId } = payload || {};
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('user_typing', {
          userId: socket.userId,
          typing: true,
        });
      }
    });

    socket.on('typing_stop', (payload) => {
      const { receiverId } = payload || {};
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('user_typing', {
          userId: socket.userId,
          typing: false,
        });
      }
    });

    socket.on('send_group_message', async (payload) => {
      try {
        const { groupId, text } = payload || {};
        if (!groupId || !text?.trim()) return;
        const group = await Group.findById(groupId);
        if (!group || !group.members.some((m) => m.toString() === socket.userId)) return;
        const msg = await GroupMessage.create({
          groupId,
          senderId: socket.userId,
          text: text.trim(),
        });
        const populated = await GroupMessage.findById(msg._id)
          .populate('senderId', '_id name profilePic')
          .lean();
        io.to(`group:${groupId}`).emit('new_group_message', populated);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('join_group_room', async (groupId) => {
      const group = await Group.findById(groupId);
      if (group && group.members.some((m) => m.toString() === socket.userId)) {
        socket.join(`group:${groupId}`);
      }
    });
  });
};

module.exports = { setupSocket, getOnlineUsers };
