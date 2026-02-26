const Post = require('../models/Post');
const Notification = require('../models/Notification');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const { uploadImage } = require('../config/cloudinary');

const POST_IMAGE_FOLDER = 'chat-app/posts';

const getFeed = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const accepted = await FriendRequest.find({
      status: 'accepted',
      $or: [{ fromUserId: userId }, { toUserId: userId }],
    }).select('fromUserId toUserId').lean();
    const friendIds = accepted.map((r) => (r.fromUserId.toString() === userId.toString() ? r.toUserId : r.fromUserId));
    const authorIds = [userId, ...friendIds];
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = parseInt(req.query.skip, 10) || 0;
    const posts = await Post.find({
      author: { $in: authorIds },
      $or: [{ trashedAt: null }, { trashedAt: { $exists: false } }],
    })
      .populate('author', '_id name profilePic')
      .populate('comments.author', '_id name profilePic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json(posts);
  } catch (err) {
    next(err);
  }
};

const getPostsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = parseInt(req.query.skip, 10) || 0;
    const posts = await Post.find({
      author: userId,
      $or: [{ trashedAt: null }, { trashedAt: { $exists: false } }],
    })
      .populate('author', '_id name profilePic')
      .populate('comments.author', '_id name profilePic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json(posts);
  } catch (err) {
    next(err);
  }
};

const createPost = async (req, res, next) => {
  try {
    const { caption, image: imageBase64 } = req.body;
    const hasCaption = typeof caption === 'string' && caption.trim().length > 0;
    if (!hasCaption && !imageBase64) {
      return res.status(400).json({ message: 'Add a caption or a photo.' });
    }
    let imageUrl = null;
    if (imageBase64) {
      imageUrl = await uploadImage(imageBase64, POST_IMAGE_FOLDER);
    }
    const post = await Post.create({
      author: req.user._id,
      caption: (caption || '').trim(),
      image: imageUrl,
    });
    const populated = await Post.findById(post._id)
      .populate('author', '_id name profilePic')
      .populate('comments.author', '_id name profilePic')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

const notTrashed = () => ({ $or: [{ trashedAt: null }, { trashedAt: { $exists: false } }] });

const toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, ...notTrashed() });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const userId = req.user._id;
    const userIdStr = userId.toString();
    const index = post.likes.findIndex((id) => id.toString() === userIdStr);
    if (index === -1) {
      post.likes.push(userId);
      await post.save();
      const postAuthorId = post.author.toString();
      if (postAuthorId !== userIdStr) {
        const notif = await Notification.create({
          userId: post.author,
          type: 'post_like',
          fromUserId: userId,
          postId: post._id,
          message: `${req.user.name} liked your post`,
        });
        const io = req.app.get('io');
        if (io) {
          const fromUser = await User.findById(userId).select('_id name email profilePic').lean();
          io.to(`user:${postAuthorId}`).emit('new_notification', {
            _id: notif._id,
            type: 'post_like',
            fromUserId: fromUser,
            postId: post._id,
            message: notif.message,
            createdAt: notif.createdAt,
            read: false,
          });
        }
      }
    } else {
      post.likes.splice(index, 1);
      await post.save();
    }
    const populated = await Post.findById(post._id)
      .populate('author', '_id name profilePic')
      .populate('comments.author', '_id name profilePic')
      .lean();
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    const post = await Post.findOne({ _id: req.params.id, ...notTrashed() });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const commentText = String(text).trim();
    post.comments.push({
      author: req.user._id,
      text: commentText,
    });
    await post.save();
    const postAuthorId = post.author.toString();
    const currentUserIdStr = req.user._id.toString();
    if (postAuthorId !== currentUserIdStr) {
      const notif = await Notification.create({
        userId: post.author,
        type: 'post_comment',
        fromUserId: req.user._id,
        postId: post._id,
        message: `${req.user.name} commented on your post`,
      });
      const io = req.app.get('io');
      if (io) {
        const fromUser = await User.findById(req.user._id).select('_id name email profilePic').lean();
        io.to(`user:${postAuthorId}`).emit('new_notification', {
          _id: notif._id,
          type: 'post_comment',
          fromUserId: fromUser,
          postId: post._id,
          message: notif.message,
          createdAt: notif.createdAt,
          read: false,
        });
      }
    }
    const populated = await Post.findById(post._id)
      .populate('author', '_id name profilePic')
      .populate('comments.author', '_id name profilePic')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

/** Move post to trash (author only). Permanently deleted after 30 days. */
const trashPost = async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, ...notTrashed() });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the author can delete this post' });
    }
    post.trashedAt = new Date();
    await post.save();
    res.json({ message: 'Post moved to trash. It will be permanently deleted after 30 days.' });
  } catch (err) {
    next(err);
  }
};

/** List current user's trashed posts. */
const getTrashedPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({
      author: req.user._id,
      trashedAt: { $ne: null },
    })
      .populate('author', '_id name profilePic')
      .populate('comments.author', '_id name profilePic')
      .sort({ trashedAt: -1 })
      .lean();
    res.json(posts);
  } catch (err) {
    next(err);
  }
};

/** Restore post from trash (author only). */
const restorePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the author can restore this post' });
    }
    if (!post.trashedAt) {
      return res.status(400).json({ message: 'Post is not in trash' });
    }
    post.trashedAt = null;
    await post.save();
    const populated = await Post.findById(post._id)
      .populate('author', '_id name profilePic')
      .populate('comments.author', '_id name profilePic')
      .lean();
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

const TRASH_DAYS = 30;

/** Permanently delete posts that have been in trash for more than TRASH_DAYS. */
const cleanupTrashedPosts = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TRASH_DAYS);
  const result = await Post.deleteMany({
    trashedAt: { $ne: null, $lt: cutoff },
  });
  if (result.deletedCount > 0) {
    console.log(`[posts] Permanently deleted ${result.deletedCount} trashed post(s) older than ${TRASH_DAYS} days.`);
  }
};

module.exports = {
  getFeed,
  getPostsByUser,
  createPost,
  toggleLike,
  addComment,
  trashPost,
  getTrashedPosts,
  restorePost,
  cleanupTrashedPosts,
};
