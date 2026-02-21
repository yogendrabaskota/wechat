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
    }).populate('members', '_id name email');
    if (!conversation) {
      conversation = await Conversation.create({
        members: [currentUserId, receiverId],
      });
      conversation = await Conversation.findById(conversation._id).populate(
        'members',
        '_id name email'
      );
    }
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .populate('senderId', '_id name')
      .populate('receiverId', '_id name')
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
      .populate('senderId', '_id name')
      .populate('receiverId', '_id name')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

module.exports = { getOrCreateConversation, sendMessage };
