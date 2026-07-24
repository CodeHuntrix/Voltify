const pool = require('../config/db');

/**
 * Calculates the active multiplier for a user based on streak
 */
const getMultiplier = async (userId) => {
  const userResult = await pool.query(
    'SELECT streak_days, coins FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) return 1.0;

  let multiplier = 1.0;

  if (user.streak_days >= 90) multiplier *= 1.6;
  else if (user.streak_days >= 30) multiplier *= 1.35;
  else if (user.streak_days >= 7)  multiplier *= 1.15;

  return parseFloat(multiplier.toFixed(3));
};

/**
 * Awards coins to a user
 */
const awardCoins = async (userId, baseCoins, type, reason) => {
  if (baseCoins <= 0) return { awarded: 0, multiplier: 1.0, new_balance: 0 };

  const multiplier = await getMultiplier(userId);
  const finalCoins = Math.round(baseCoins * multiplier);

  await pool.query(
    `INSERT INTO coin_transactions (user_id, coins, type, reason, multiplier)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, finalCoins, type, reason, multiplier]
  );

  const result = await pool.query(
    `UPDATE users SET coins = coins + $1 WHERE id = $2 RETURNING coins`,
    [finalCoins, userId]
  );

  return {
    awarded: finalCoins,
    multiplier,
    new_balance: result.rows[0].coins,
  };
};

/**
 * Calculates savings-based coins
 */
const calculateSavingsCoins = (predictedUnits, actualUnits) => {
  const savedUnits = Math.max(0, predictedUnits - actualUnits);
  return Math.round(savedUnits * 10);
};

/**
 * Updates streak and awards streak bonus if applicable
 */
const updateStreak = async (userId) => {
  const lastCheckinResult = await pool.query(
    `SELECT created_at::date AS last_checkin_date 
     FROM coin_transactions 
     WHERE user_id = $1 AND type = 'checkin' 
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  const userResult = await pool.query(
    'SELECT streak_days FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastCheckinDateVal = lastCheckinResult.rows[0]?.last_checkin_date;
  let newStreak = user.streak_days;

  if (!lastCheckinDateVal) {
    // First check-in ever!
    newStreak = 1;
  } else {
    const lastCheckin = new Date(lastCheckinDateVal);
    lastCheckin.setHours(0, 0, 0, 0);

    const daysSinceLastCheckin = Math.floor((today - lastCheckin) / (1000 * 60 * 60 * 24));

    if (daysSinceLastCheckin === 0) {
      return user.streak_days;
    } else if (daysSinceLastCheckin === 1) {
      newStreak = user.streak_days + 1;
    } else {
      newStreak = 1;
    }
  }

  await pool.query(
    `UPDATE users SET streak_days = $1, last_active = CURRENT_DATE WHERE id = $2`,
    [newStreak, userId]
  );

  const milestones = { 7: 50, 30: 150, 90: 500 };
  if (milestones[newStreak]) {
    await awardCoins(userId, milestones[newStreak], 'streak', `${newStreak}-day streak milestone!`);
  }

  return newStreak;
};

/**
 * Gets the current coin balance and recent transactions
 */
const getCoinStats = async (userId) => {
  const balanceResult = await pool.query(
    'SELECT coins, streak_days FROM users WHERE id = $1',
    [userId]
  );

  const transactionsResult = await pool.query(
    `SELECT coins, type, reason, multiplier, created_at
     FROM coin_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );

  const weeklyResult = await pool.query(
    `SELECT COALESCE(SUM(coins), 0) AS weekly_coins
     FROM coin_transactions
     WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '7 days'
       AND type = 'earned'`,
    [userId]
  );

  const multiplier = await getMultiplier(userId);
  const user = balanceResult.rows[0];

  return {
    balance: user?.coins || 0,
    streak_days: user?.streak_days || 0,
    active_multiplier: multiplier,
    weekly_coins_earned: parseInt(weeklyResult.rows[0]?.weekly_coins || 0),
    recent_transactions: transactionsResult.rows,
  };
};

module.exports = { awardCoins, calculateSavingsCoins, updateStreak, getCoinStats, getMultiplier };
