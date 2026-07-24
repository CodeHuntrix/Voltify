const pool = require('../config/db');
const { mockLeaderboardUsers } = require('../utils/mockData');

/**
 * GET /api/leaderboard/:type?period=weekly|alltime
 */
const getLeaderboard = async (req, res) => {
  const { type } = req.params;
  const { period = 'weekly' } = req.query;
  const userId = req.user.id;

  const validTypes = ['bachelor', 'family', 'large_family', 'organization'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
  }

  const realUsersResult = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.coins,
       u.streak_days,
       (SELECT bill_amount FROM monthly_bills WHERE user_id = u.id ORDER BY month DESC LIMIT 1) AS last_bill
     FROM users u
     WHERE u.household_type = $1
       AND u.onboarding_complete = TRUE`,
    [type]
  );

  const realEntries = realUsersResult.rows.map(u => {
    const savingsPct = 5 + Math.floor(u.coins / 100);
    return {
      id: u.id,
      name: u.name,
      coins: u.coins,
      streak_days: u.streak_days,
      savings_pct: Math.min(25, savingsPct),
      rank_change: 0,
      is_current_user: u.id === userId,
    };
  });

  const mockEntries = (mockLeaderboardUsers[type] || []).map(m => ({
    ...m,
    is_current_user: false,
  }));

  const combined = [...realEntries, ...mockEntries]
    .sort((a, b) => b.coins - a.coins)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  const userRank = combined.find(e => e.is_current_user);

  return res.status(200).json({
    type,
    period,
    rankings: combined,
    user_rank: userRank ? { rank: userRank.rank, rank_change: userRank.rank_change } : null,
  });
};

module.exports = { getLeaderboard };
