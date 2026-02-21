const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const { getMe, searchUsers } = require('../controllers/user.controller');

const router = express.Router();

router.use(auth);
router.get('/me', getMe);
router.get('/search', searchUsers);

module.exports = router;
