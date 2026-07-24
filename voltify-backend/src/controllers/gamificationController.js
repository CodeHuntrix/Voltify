const pool = require('../config/db');
const coinService = require('../services/coinService');
const challengeService = require('../services/challengeService');
const { coinShopItems } = require('../utils/mockData');
const notificationService = require('../services/notificationService');
const { getEffectiveTariffRate, calculateMonthlyEstimates } = require('../services/estimationEngine');

/**
 * GET /api/gamification/stats
 */
const getStats = async (req, res) => {
  const userId = req.user.id;
  const coinStats = await coinService.getCoinStats(userId);

  const userResult = await pool.query(
    'SELECT household_type FROM users WHERE id = $1',
    [userId]
  );
  const householdType = userResult.rows[0]?.household_type || 'family';

  const multipliers = [];
  if (coinStats.streak_days >= 7) {
    let multiplierVal = 1.0;
    if (coinStats.streak_days >= 90) multiplierVal = 1.6;
    else if (coinStats.streak_days >= 30) multiplierVal = 1.35;
    else multiplierVal = 1.15;
    multipliers.push({
      type: 'streak',
      label: `🔥 ${coinStats.streak_days}-day streak`,
      value: multiplierVal,
    });
  }

  const nextMilestone =
    coinStats.streak_days < 7  ? { days: 7,  bonus_coins: 50,  multiplier: 1.15 } :
    coinStats.streak_days < 30 ? { days: 30, bonus_coins: 150, multiplier: 1.35 } :
    coinStats.streak_days < 90 ? { days: 90, bonus_coins: 500, multiplier: 1.60 } :
    null;

  return res.status(200).json({
    ...coinStats,
    household_type: householdType,
    active_multipliers: multipliers,
    next_milestone: nextMilestone,
  });
};

/**
 * GET /api/gamification/challenge
 */
const getChallenge = async (req, res) => {
  const userId = req.user.id;
  const challenge = await challengeService.getActiveChallenge(userId);
  const history = await challengeService.getChallengeHistory(userId);

  return res.status(200).json({ challenge, history });
};

/**
 * POST /api/gamification/check-challenge
 */
const checkChallenge = async (req, res) => {
  const userId = req.user.id;
  const result = await challengeService.checkAndResolveChallenge(userId);
  return res.status(200).json(result);
};

/**
 * GET /api/gamification/shop
 */
const getShop = async (req, res) => {
  const userId = req.user.id;
  const userResult = await pool.query('SELECT coins FROM users WHERE id = $1', [userId]);
  const userCoins = userResult.rows[0]?.coins || 0;

  const itemsWithAffordability = coinShopItems.map(item => ({
    ...item,
    can_afford: userCoins >= item.coins_required,
    coins_needed: Math.max(0, item.coins_required - userCoins),
  }));

  return res.status(200).json({ items: itemsWithAffordability, user_coins: userCoins });
};

/**
 * POST /api/gamification/redeem
 */
const redeemItem = async (req, res) => {
  const { item_id } = req.body;
  const userId = req.user.id;

  if (!item_id) {
    return res.status(400).json({ error: 'item_id is required' });
  }

  const item = coinShopItems.find(i => i.id === item_id);
  if (!item) {
    return res.status(404).json({ error: 'Shop item not found' });
  }

  const userResult = await pool.query('SELECT coins FROM users WHERE id = $1', [userId]);
  const userCoins = userResult.rows[0]?.coins || 0;

  if (userCoins < item.coins_required) {
    return res.status(400).json({
      error: `Insufficient coins. You have ${userCoins} coins, need ${item.coins_required}`,
      coins_needed: item.coins_required - userCoins,
    });
  }

  await pool.query(
    `UPDATE users SET coins = coins - $1 WHERE id = $2`,
    [item.coins_required, userId]
  );

  await pool.query(
    `INSERT INTO coin_transactions (user_id, coins, type, reason, multiplier)
     VALUES ($1, $2, 'redeemed', $3, 1.0)`,
    [userId, -item.coins_required, `Redeemed: ${item.reward}`]
  );

  await notificationService.create(userId, {
    type: 'redemption',
    title: '🎉 Redemption Submitted!',
    message: `Your request for "${item.reward}" has been submitted. We'll contact you within 24 hours.`,
    action_url: '/leaderboard',
  });

  const newBalance = userCoins - item.coins_required;
  return res.status(200).json({
    success: true,
    message: "Redemption request submitted! We'll contact you within 24 hours.",
    redeemed_item: item.reward,
    coins_spent: item.coins_required,
    new_balance: newBalance,
  });
};

/**
 * POST /api/gamification/check-in
 */
const dailyCheckin = async (req, res) => {
  const userId = req.user.id;
  const { total_units, appliance_hours } = req.body;

  if (total_units === undefined || total_units === null || isNaN(parseFloat(total_units)) || parseFloat(total_units) < 0) {
    return res.status(400).json({ error: 'Valid total_units (kWh) is required' });
  }
  if (!appliance_hours || typeof appliance_hours !== 'object') {
    return res.status(400).json({ error: 'appliance_hours object is required' });
  }

  const totalUnits = parseFloat(total_units);

  try {
    const checkinQuery = await pool.query(
      `SELECT 1 FROM coin_transactions 
       WHERE user_id = $1 
         AND type = 'checkin' 
         AND created_at::date = CURRENT_DATE`,
      [userId]
    );

    if (checkinQuery.rows.length > 0) {
      return res.status(400).json({ error: 'You have already checked in today!' });
    }

    // Get user's location & calculate today's actual cost
    const userResult = await pool.query(
      'SELECT location FROM users WHERE id = $1',
      [userId]
    );
    const location = userResult.rows[0]?.location || 'Chennai';

    const billResult = await pool.query(
      `SELECT units FROM monthly_bills WHERE user_id = $1 ORDER BY month DESC LIMIT 1`,
      [userId]
    );
    const actualUnits = billResult.rows[0]?.units ? parseFloat(billResult.rows[0].units) : null;

    let monthlyUnits = actualUnits;
    if (monthlyUnits === null) {
      const appliancesResult = await pool.query(
        'SELECT * FROM appliances WHERE user_id = $1',
        [userId]
      );
      const appliances = appliancesResult.rows;
      const monthIndex = new Date().getMonth();
      const withEstimates = calculateMonthlyEstimates(appliances, monthIndex, location, null, null);
      monthlyUnits = withEstimates.reduce((sum, app) => sum + (app.estimated_monthly_kwh || 0), 0);
    }

    const effectiveTariff = getEffectiveTariffRate(location, monthlyUnits);
    const todayCost = parseFloat((totalUnits * effectiveTariff).toFixed(2));
    const todayStr = new Date().toISOString().split('T')[0];

    // Begin database transaction to save telemetry
    await pool.query('BEGIN');

    await pool.query(
      `INSERT INTO daily_checkins (user_id, date, total_units, appliance_hours)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, date) DO UPDATE 
       SET total_units = EXCLUDED.total_units,
           appliance_hours = EXCLUDED.appliance_hours`,
      [userId, todayStr, totalUnits, JSON.stringify(appliance_hours)]
    );

    await pool.query(
      `INSERT INTO daily_estimates (user_id, date, estimated_units, estimated_cost)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, date) DO UPDATE
       SET estimated_units = EXCLUDED.estimated_units,
           estimated_cost = EXCLUDED.estimated_cost`,
      [userId, todayStr, totalUnits, todayCost]
    );

    await pool.query('COMMIT');

    // Update streak (advances by 1, resets to 1, or remains same)
    const newStreak = await coinService.updateStreak(userId);

    // Award base coins
    const baseCoins = 25;
    const checkinAward = await coinService.awardCoins(userId, baseCoins, 'checkin', 'Daily Check-In Reward');

    // Create notification
    await notificationService.create(userId, {
      type: 'checkin',
      title: '✨ Daily Check-in Complete!',
      message: `You checked in today, advanced your streak to ${newStreak} days, and earned ${checkinAward.awarded} coins!`,
      action_url: '/streak',
    });

    return res.status(200).json({
      success: true,
      message: 'Checked in successfully!',
      coins_earned: checkinAward.awarded,
      new_balance: checkinAward.new_balance,
      new_streak: newStreak,
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Error in dailyCheckin:", err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { getStats, getChallenge, checkChallenge, getShop, redeemItem, dailyCheckin };
