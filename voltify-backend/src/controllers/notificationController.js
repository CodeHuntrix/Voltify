const notificationService = require('../services/notificationService');

/**
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
  const notifications = await notificationService.getByUserId(req.user.id);
  const unreadCount = await notificationService.getUnreadCount(req.user.id);
  return res.status(200).json({ notifications, unread_count: unreadCount });
};

/**
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  return res.status(200).json({ count });
};

/**
 * PUT /api/notifications/:id/read
 */
const markRead = async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user.id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  return res.status(200).json({ success: true, notification });
};

/**
 * PUT /api/notifications/read-all
 */
const markAllRead = async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  return res.status(200).json({ success: true });
};

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead };
