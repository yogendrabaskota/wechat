const Conversation = require('../models/Conversation');

const listMyConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      members: req.user._id,
    })
      .populate('members', '_id name email')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(conversations);
  } catch (err) {
    next(err);
  }
};

module.exports = { listMyConversations };
