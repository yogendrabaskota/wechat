const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const { sendRequest, acceptRequest, declineRequest, listFriends, getStatus } = require('../controllers/friend.controller');

const router = express.Router();

router.use(auth);
router.post('/request/:userId', sendRequest);
router.post('/accept/:requestId', acceptRequest);
router.post('/decline/:requestId', declineRequest);
router.get('/', listFriends);
router.get('/status/:userId', getStatus);

module.exports = router;
