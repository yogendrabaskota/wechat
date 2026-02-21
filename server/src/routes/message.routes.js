const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const {
  getOrCreateConversation,
  sendMessage,
  unsendMessage,
} = require('../controllers/message.controller');

const router = express.Router();

router.use(auth);
router.get('/:receiverId', getOrCreateConversation);
router.post('/send/:receiverId', sendMessage);
router.post('/unsend/:messageId', unsendMessage);

module.exports = router;
