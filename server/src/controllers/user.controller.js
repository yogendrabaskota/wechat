const User = require('../models/User');

const getMe = (req, res) => {
  res.json(req.user);
};

const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length === 0) {
      return res.json([]);
    }
    const search = new RegExp(query.trim(), 'i');
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ name: search }, { email: search }],
    })
      .select('_id name email profilePic')
      .limit(20)
      .lean();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('_id name email profilePic').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = { getMe, searchUsers, getUserById };
