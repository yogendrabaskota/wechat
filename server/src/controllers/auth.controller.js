const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const { uploadUserProfilePic } = require('../utils/uploadProfilePic');

const register = async (req, res, next) => {
  try {
    const { name, email, password, profilePic: profilePicBase64 } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    let profilePicUrl = null;
    if (profilePicBase64) {
      profilePicUrl = await uploadUserProfilePic(profilePicBase64);
    }
    const user = await User.create({ name, email, password, profilePic: profilePicUrl });
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({
      user: { _id: user._id, name: user.name, email: user.email, profilePic: user.profilePic },
      token,
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({
      user: { _id: user._id, name: user.name, email: user.email, profilePic: user.profilePic },
      token,
    });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
};

module.exports = { register, login, logout };
