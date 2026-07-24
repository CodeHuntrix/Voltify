const pool = require('../config/db');

/**
 * Creates a notification for a user
 */
const create = async (userId, { type, title, message, action_url = null }) => {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, action_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, message, action_url]
  );
  return result.rows[0];
};

/**
 * Gets all notifications for a user (newest first)
 */
const getByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT id, type, title, message, read, action_url, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
};

/**
 * Gets unread notification count
 */
const getUnreadCount = async (userId) => {
  const result = await pool.query(
    `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read = FALSE`,
    [userId]
  );
  return parseInt(result.rows[0].count || 0);
};

/**
 * Marks a notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const result = await pool.query(
    `UPDATE notifications SET read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  return result.rows[0] || null;
};

/**
 * Marks all notifications as read
 */
const markAllAsRead = async (userId) => {
  await pool.query(
    `UPDATE notifications SET read = TRUE WHERE user_id = $1`,
    [userId]
  );
};

/**
 * Generates rule-based notifications for a user
 */
const generateRuleBasedNotifications = async (userId) => {
  const recentBills = await pool.query(
    `SELECT bill_amount FROM monthly_bills WHERE user_id = $1 ORDER BY month DESC LIMIT 2`,
    [userId]
  );

  if (recentBills.rows.length >= 2) {
    const thisMonth = parseFloat(recentBills.rows[0].bill_amount);
    const lastMonth = parseFloat(recentBills.rows[1].bill_amount);
    const increaseRatio = thisMonth / lastMonth;

    if (increaseRatio > 1.2) {
      const recent = await pool.query(
        `SELECT id FROM notifications
         WHERE user_id = $1 AND type = 'bill_alert'
         AND created_at > NOW() - INTERVAL '7 days'`,
        [userId]
      );
      if (recent.rows.length === 0) {
        await create(userId, {
          type: 'bill_alert',
          title: '⚠ Bill Alert',
          message: `Your estimated usage is trending ${Math.round((increaseRatio - 1) * 100)}% higher than last month`,
          action_url: '/dashboard',
        });
      }
    }
  }
};

module.exports = { create, getByUserId, getUnreadCount, markAsRead, markAllAsRead, generateRuleBasedNotifications };
