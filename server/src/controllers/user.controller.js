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

module.exports = { getMe, searchUsers };
