const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const { getMe, searchUsers, getUserById } = require('../controllers/user.controller');

const router = express.Router();

router.use(auth);
router.get('/me', getMe);
router.get('/search', searchUsers);
router.get('/:userId', getUserById);

module.exports = router;
