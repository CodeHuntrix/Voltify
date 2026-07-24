const pool = require('../config/db');

/**
 * GET /api/profile
 */
const getProfile = async (req, res) => {
  const userId = req.user.id;

  const userResult = await pool.query(
    `SELECT id, name, email, tier, household_type, location, home_type,
            coins, streak_days, onboarding_complete, created_at
     FROM users WHERE id = $1`,
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const totalCoinsResult = await pool.query(
    `SELECT COALESCE(SUM(coins), 0) AS total FROM coin_transactions
     WHERE user_id = $1 AND type IN ('earned', 'streak', 'challenge')`,
    [userId]
  );

  const challengesWonResult = await pool.query(
    `SELECT COUNT(*) AS count FROM challenges
     WHERE user_id = $1 AND status = 'completed'`,
    [userId]
  );

  const billsUploadedResult = await pool.query(
    `SELECT COUNT(*) AS count FROM monthly_bills WHERE user_id = $1`,
    [userId]
  );

  const bestStreakResult = await pool.query(
    `SELECT COALESCE(MAX(streak_days), 0) AS best FROM users WHERE id = $1`,
    [userId]
  );

  const cssAppliedResult = await pool.query(
    `SELECT COUNT(*) AS count FROM css_applications WHERE user_id = $1`,
    [userId]
  );

  const cssSavingsResult = await pool.query(
    `SELECT COALESCE(SUM(monthly_savings), 0) AS monthly FROM css_applications WHERE user_id = $1`,
    [userId]
  );
  const monthsSinceJoined = Math.max(1,
    Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24 * 30))
  );
  const totalSavingsRs = parseFloat(cssSavingsResult.rows[0]?.monthly || 0) * monthsSinceJoined;

  const challengesWon = parseInt(challengesWonResult.rows[0]?.count || 0);
  const billsUploaded = parseInt(billsUploadedResult.rows[0]?.count || 0);
  const cssApplied = parseInt(cssAppliedResult.rows[0]?.count || 0);
  const streakDays = user.streak_days || 0;

  const savingsPts   = Math.min(30, Math.round(cssApplied * 3));
  const streakPts    = Math.min(20, Math.round(streakDays / 5));
  const challengePts = Math.min(25, challengesWon * 5);
  const cssPts       = Math.min(15, cssApplied * 5);
  const billPts      = Math.min(10, billsUploaded * 2);
  const energyScore  = savingsPts + streakPts + challengePts + cssPts + billPts;

  const improvementTips = [];
  if (cssApplied === 0) improvementTips.push('Apply 1 CSS recommendation (+5 pts)');
  if (challengesWon === 0) improvementTips.push('Complete your first challenge (+5 pts)');
  if (billsUploaded < 2) improvementTips.push('Upload 2 months of bills (+4 pts)');
  if (streakDays < 7) improvementTips.push('Maintain a 7-day streak (+1.4 pts)');

  const activityResult = await pool.query(
    `(SELECT 'coin' AS type, reason AS description, created_at FROM coin_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5)
     UNION ALL
     (SELECT 'challenge' AS type, title AS description, updated_at AS created_at FROM challenges WHERE user_id = $1 AND status = 'completed' ORDER BY updated_at DESC LIMIT 3)
     ORDER BY created_at DESC LIMIT 8`,
    [userId]
  );

  return res.status(200).json({
    user,
    lifetime_stats: {
      total_coins_earned: parseInt(totalCoinsResult.rows[0]?.total || 0),
      total_savings_rs: parseFloat(totalSavingsRs.toFixed(2)),
      best_streak: parseInt(bestStreakResult.rows[0]?.best || 0),
      challenges_completed: challengesWon,
      bills_uploaded: billsUploaded,
      css_applied: cssApplied,
    },
    energy_score: {
      score: energyScore,
      breakdown: { savings_pts: savingsPts, streak_pts: streakPts, challenge_pts: challengePts, css_pts: cssPts, bill_pts: billPts },
      improvement_tips: improvementTips,
    },
    recent_activity: activityResult.rows,
  });
};

/**
 * PUT /api/profile/update
 */
const updateProfile = async (req, res) => {
  const { name, location, home_type } = req.body;
  const userId = req.user.id;

  const updates = [];
  const values = [];
  let i = 1;

  if (name) { updates.push(`name = $${i++}`); values.push(name.trim()); }
  if (location) {
    const validLocations = ['Chennai', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Kolkata'];
    if (!validLocations.includes(location.trim())) {
      return res.status(400).json({ error: `location must be one of: ${validLocations.join(', ')}` });
    }
    updates.push(`location = $${i++}`);
    values.push(location.trim());
  }
  if (home_type) {
    const validTypes = ['apartment', 'house', 'villa'];
    if (!validTypes.includes(home_type)) {
      return res.status(400).json({ error: `home_type must be one of: ${validTypes.join(', ')}` });
    }
    updates.push(`home_type = $${i++}`);
    values.push(home_type);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(userId);
  const result = await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, name, email, location, home_type`,
    values
  );

  return res.status(200).json({ success: true, user: result.rows[0] });
};

module.exports = { getProfile, updateProfile };
