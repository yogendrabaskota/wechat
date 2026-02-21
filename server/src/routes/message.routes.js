const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const {
  getOrCreateConversation,
  sendMessage,
} = require('../controllers/message.controller');

const router = express.Router();

router.use(auth);
router.get('/:receiverId', getOrCreateConversation);
router.post('/send/:receiverId', sendMessage);

module.exports = router;
