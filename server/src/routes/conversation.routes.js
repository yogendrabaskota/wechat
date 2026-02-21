const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const { listMyConversations } = require('../controllers/conversation.controller');

const router = express.Router();

router.use(auth);
router.get('/', listMyConversations);

module.exports = router;
