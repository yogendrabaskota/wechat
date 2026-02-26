const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

const getOrCreateConversation = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const receiverId = req.params.receiverId;
    if (currentUserId.toString() === receiverId) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }
    let conversation = await Conversation.findOne({
      members: { $all: [currentUserId, receiverId] },
    }).populate('members', '_id name email profilePic');
    if (!conversation) {
      conversation = await Conversation.create({
        members: [currentUserId, receiverId],
      });
      conversation = await Conversation.findById(conversation._id).populate(
        'members',
        '_id name email profilePic'
      );
    }
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .populate('senderId', '_id name profilePic')
      .populate('receiverId', '_id name profilePic')
      .lean();
    res.json({ conversation, messages });
  } catch (err) {
    next(err);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const receiverId = req.params.receiverId;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }
    if (currentUserId.toString() === receiverId) {
      return res.status(400).json({ message: 'Cannot send to yourself' });
    }
    let conversation = await Conversation.findOne({
      members: { $all: [currentUserId, receiverId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        members: [currentUserId, receiverId],
      });
    }
    const message = await Message.create({
      senderId: currentUserId,
      receiverId,
      conversationId: conversation._id,
      text: text.trim(),
    });
    const populated = await Message.findById(message._id)
      .populate('senderId', '_id name profilePic')
      .populate('receiverId', '_id name profilePic')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

const unsendMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only unsend your own messages' });
    }
    if (message.deleted) {
      return res.status(400).json({ message: 'Message already unsent' });
    }
    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${message.receiverId.toString()}`).emit('message_unsent', { messageId: message._id });
      io.to(`user:${message.senderId.toString()}`).emit('message_unsent', { messageId: message._id });
    }
    res.json({ message: 'Message unsent' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOrCreateConversation, sendMessage, unsendMessage };
