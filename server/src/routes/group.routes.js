const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const { listMy, create, getOne, getMessages, leaveGroup, promoteToAdmin, unsendGroupMessage } = require('../controllers/group.controller');

const router = express.Router();

router.use(auth);
router.get('/', listMy);
router.post('/', create);
router.get('/:id', getOne);
router.get('/:id/messages', getMessages);
router.post('/:id/leave', leaveGroup);
router.post('/:id/promote/:userId', promoteToAdmin);
router.post('/:id/messages/:messageId/unsend', unsendGroupMessage);

module.exports = router;
