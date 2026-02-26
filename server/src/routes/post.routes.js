const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const {
  getFeed,
  getPostsByUser,
  createPost,
  toggleLike,
  addComment,
  trashPost,
  getTrashedPosts,
  restorePost,
} = require('../controllers/post.controller');

const router = express.Router();

router.get('/', auth, getFeed);
router.get('/trash', auth, getTrashedPosts);
router.get('/user/:userId', auth, getPostsByUser);
router.post('/', auth, createPost);
router.post('/:id/like', auth, toggleLike);
router.post('/:id/comments', auth, addComment);
router.post('/:id/trash', auth, trashPost);
router.post('/:id/restore', auth, restorePost);

module.exports = router;
