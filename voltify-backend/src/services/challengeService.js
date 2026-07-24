const pool = require('../config/db');
const coinService = require('./coinService');
const notificationService = require('./notificationService');

/**
 * Creates a weekly challenge for a user
 */
const createWeeklyChallenge = async (userId, estimatedMonthlyUnits) => {
  const weeklyBase = estimatedMonthlyUnits / 4.33;
  const target = parseFloat((weeklyBase * 0.9).toFixed(3));

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const existing = await pool.query(
    `SELECT id FROM challenges
     WHERE user_id = $1 AND week_start = $2`,
    [userId, weekStart.toISOString().split('T')[0]]
  );

  if (existing.rows.length > 0) return existing.rows[0];

  const result = await pool.query(
    `INSERT INTO challenges (user_id, title, target_units, difficulty, week_start, week_end, coins_reward)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      userId,
      `Use under ${target.toFixed(0)} units this week`,
      target,
      'medium',
      weekStart.toISOString().split('T')[0],
      weekEnd.toISOString().split('T')[0],
      100,
    ]
  );

  return result.rows[0];
};

/**
 * Gets the active challenge for a user (current week)
 */
const getActiveChallenge = async (userId) => {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const weeklyUnitsResult = await pool.query(
    `SELECT COALESCE(SUM(estimated_units), 0) AS total_units
     FROM daily_estimates
     WHERE user_id = $1
       AND date >= $2
       AND date <= CURRENT_DATE`,
    [userId, weekStartStr]
  );
  const weeklyUnits = parseFloat(weeklyUnitsResult.rows[0]?.total_units || 0);

  await pool.query(
    `UPDATE challenges
     SET current_units = $1
     WHERE user_id = $2 AND status = 'active'`,
    [weeklyUnits, userId]
  );

  const result = await pool.query(
    `SELECT * FROM challenges
     WHERE user_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (!result.rows[0]) return null;

  const challenge = result.rows[0];
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(challenge.week_end) - new Date()) / (1000 * 60 * 60 * 24))
  );

  return {
    ...challenge,
    days_remaining: daysRemaining,
    progress_pct: Math.min(100, parseFloat(((challenge.current_units / challenge.target_units) * 100).toFixed(1))),
    on_track: challenge.current_units <= challenge.target_units,
  };
};

/**
 * Checks and completes/fails a challenge
 */
const checkAndResolveChallenge = async (userId) => {
  const challenge = await getActiveChallenge(userId);
  if (!challenge) return null;

  const today = new Date();
  const weekEnd = new Date(challenge.week_end);

  if (today < weekEnd) return challenge;

  if (challenge.current_units <= challenge.target_units) {
    await pool.query(
      `UPDATE challenges SET status = 'completed' WHERE id = $1`,
      [challenge.id]
    );

    const coinResult = await coinService.awardCoins(
      userId, challenge.coins_reward, 'challenge',
      `Completed challenge: "${challenge.title}"`
    );

    await notificationService.create(userId, {
      type: 'challenge_completed',
      title: '🎯 Challenge Complete!',
      message: `You completed "${challenge.title}" and earned ${coinResult.awarded} coins!`,
      action_url: '/leaderboard',
    });

    const estimatedMonthly = (parseFloat(challenge.target_units) / 0.9) * 4.33;
    await createWeeklyChallenge(userId, estimatedMonthly);

    return { ...challenge, status: 'completed', coins_earned: coinResult.awarded };
  } else {
    await pool.query(
      `UPDATE challenges SET status = 'failed' WHERE id = $1`,
      [challenge.id]
    );

    await notificationService.create(userId, {
      type: 'challenge_failed',
      title: '😔 Challenge Missed',
      message: `You missed this week's challenge. A new easier challenge is ready!`,
      action_url: '/leaderboard',
    });

    const easierMonthly = (parseFloat(challenge.target_units) * 1.1 / 0.9) * 4.33;
    await createWeeklyChallenge(userId, easierMonthly);

    return { ...challenge, status: 'failed' };
  }
};

/**
 * Gets challenge history
 */
const getChallengeHistory = async (userId) => {
  const result = await pool.query(
    `SELECT id, title, target_units, current_units, difficulty, status,
            week_start, week_end, coins_reward, created_at
     FROM challenges
     WHERE user_id = $1 AND status != 'active'
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  );
  return result.rows;
};

module.exports = { createWeeklyChallenge, getActiveChallenge, checkAndResolveChallenge, getChallengeHistory };
