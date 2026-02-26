const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const { listMy, acceptInvite, declineInvite, markAllRead } = require('../controllers/notification.controller');

const router = express.Router();

router.use(auth);
router.get('/', listMy);
router.post('/read', markAllRead);
router.post('/:id/accept', acceptInvite);
router.post('/:id/decline', declineInvite);

module.exports = router;
