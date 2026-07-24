const express = require('express');
const router = express.Router();
const { getNotifications, getUnreadCount, markRead, markAllRead } = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/',             getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all',     markAllRead);
router.put('/:id/read',     markRead);

module.exports = router;
