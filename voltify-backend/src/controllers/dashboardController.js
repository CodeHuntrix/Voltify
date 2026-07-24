const pool = require('../config/db');
const { generatePredictions, detectBillShock } = require('../services/estimationEngine');
const { generateAndSaveDailyEstimates, calculateMonthlyEstimates, addPercentageBreakdown } = require('../services/estimationEngine');
const { getLiveTemperature } = require('../services/weatherService');
const notificationService = require('../services/notificationService');

// Appliance icon map for enriching DB results with icons
const APPLIANCE_ICONS = {
  'air conditioner': '❄️',
  'ac': '❄️',
  'refrigerator': '🧊',
  'fridge': '🧊',
  'lights': '💡',
  'lighting': '💡',
  'fans': '🌀',
  'fan': '🌀',
  'washing machine': '🫧',
  'tv': '📺',
  'television': '📺',
  'water heater': '🚿',
  'geyser': '🚿',
  'microwave': '📡',
  'computer': '💻',
  'laptop': '💻',
};

const getApplianceIcon = (name) => {
  const lower = (name || '').toLowerCase();
  for (const [key, icon] of Object.entries(APPLIANCE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '🔌';
};

const NEON_COLORS = ['#22d3ee', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a78bfa'];

/**
 * GET /api/dashboard/summary
 */
const getSummary = async (req, res) => {
  const userId = req.user.id;

  const todayStr = new Date().toISOString().split('T')[0];

  // Try to get today's estimate
  let todayResult = await pool.query(
    `SELECT estimated_units, estimated_cost FROM daily_estimates
     WHERE user_id = $1 AND date = $2`,
    [userId, todayStr]
  );

  // If no data for today, seed the estimates on-the-fly
  if (todayResult.rows.length === 0) {
    const appliancesResult = await pool.query(
      'SELECT * FROM appliances WHERE user_id = $1',
      [userId]
    );
    const userResult = await pool.query(
      'SELECT location FROM users WHERE id = $1',
      [userId]
    );
    const location = userResult.rows[0]?.location || 'Chennai';

    if (appliancesResult.rows.length > 0) {
      await generateAndSaveDailyEstimates(userId, appliancesResult.rows, location, 30);
      todayResult = await pool.query(
        `SELECT estimated_units, estimated_cost FROM daily_estimates
         WHERE user_id = $1 AND date = $2`,
        [userId, todayStr]
      );
    }
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayResult = await pool.query(
    `SELECT estimated_units FROM daily_estimates
     WHERE user_id = $1 AND date = $2`,
    [userId, yesterdayStr]
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const monthResult = await pool.query(
    `SELECT COALESCE(SUM(estimated_units), 0) AS total_units,
            COALESCE(SUM(estimated_cost), 0) AS total_cost
     FROM daily_estimates
     WHERE user_id = $1 AND date >= $2 AND date <= CURRENT_DATE`,
    [userId, monthStartStr]
  );

  const lastBillResult = await pool.query(
    `SELECT bill_amount, units FROM monthly_bills
     WHERE user_id = $1 ORDER BY month DESC LIMIT 1`,
    [userId]
  );

  const userResult = await pool.query(
    'SELECT coins, streak_days FROM users WHERE id = $1',
    [userId]
  );

  const today = todayResult.rows[0];
  const yesterdayRow = yesterdayResult.rows[0];
  const thisMonth = monthResult.rows[0];
  const lastBill = lastBillResult.rows[0];
  const user = userResult.rows[0];

  const todayUnits = parseFloat(today?.estimated_units || 0);
  const yesterdayUnits = parseFloat(yesterdayRow?.estimated_units || 0);
  const dayChangeRatio = yesterdayUnits > 0 ? ((todayUnits - yesterdayUnits) / yesterdayUnits * 100) : 0;

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysElapsed = new Date().getDate();
  const daysRemaining = daysInMonth - daysElapsed;

  const avgPerDay = parseFloat(thisMonth?.total_units || 0) / Math.max(daysElapsed, 1);
  const projectedMonthlyUnits = avgPerDay * daysInMonth;
  const totalCostSoFar = parseFloat(thisMonth?.total_cost || 0);
  const avgCostPerUnit = parseFloat(thisMonth?.total_units || 0) > 0
    ? totalCostSoFar / parseFloat(thisMonth.total_units)
    : 8.0;
  const projectedBill = parseFloat((projectedMonthlyUnits * avgCostPerUnit).toFixed(2));

  try {
    await notificationService.generateRuleBasedNotifications(userId);
  } catch (e) { /* non-critical */ }

  return res.status(200).json({
    today: {
      units: parseFloat(todayUnits.toFixed(3)),
      cost: parseFloat(today?.estimated_cost || 0),
      vs_yesterday_pct: parseFloat(dayChangeRatio.toFixed(1)),
      is_higher: dayChangeRatio > 0,
    },
    this_month: {
      units: parseFloat(parseFloat(thisMonth?.total_units || 0).toFixed(3)),
      cost: parseFloat(totalCostSoFar.toFixed(2)),
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      projected_units: parseFloat(projectedMonthlyUnits.toFixed(3)),
    },
    estimated_bill: {
      projected: projectedBill,
      last_month: parseFloat(lastBill?.bill_amount || 0),
      on_track: lastBill ? projectedMonthlyUnits <= parseFloat(lastBill.units) * 1.15 : true,
    },
    gamification: {
      coins: user?.coins || 0,
      streak_days: user?.streak_days || 0,
    },
  });
};

/**
 * GET /api/dashboard/usage?period=daily|weekly|monthly
 */
const getUsage = async (req, res) => {
  const { period = 'daily' } = req.query;
  const userId = req.user.id;
  const params = [userId];

  let query;

  if (period === 'daily') {
    const appliancesResult = await pool.query(
      'SELECT * FROM appliances WHERE user_id = $1',
      [userId]
    );
    const userResult = await pool.query(
      'SELECT location FROM users WHERE id = $1',
      [userId]
    );
    const location = userResult.rows[0]?.location || 'Chennai';

    if (appliancesResult.rows.length > 0) {
      await generateAndSaveDailyEstimates(userId, appliancesResult.rows, location, 30);
    }

    query = `
      SELECT
        de.date::text AS date,
        COALESCE(dc.total_units, de.estimated_units) AS units,
        CASE
          WHEN dc.total_units IS NOT NULL
          THEN ROUND((dc.total_units * de.estimated_cost / NULLIF(de.estimated_units, 0))::numeric, 4)
          ELSE de.estimated_cost
        END AS cost,
        (dc.total_units IS NOT NULL) AS is_actual
      FROM daily_estimates de
      LEFT JOIN daily_checkins dc
        ON dc.user_id = de.user_id AND dc.date = de.date
      WHERE de.user_id = $1
        AND de.date >= CURRENT_DATE - INTERVAL '29 days'
      ORDER BY de.date ASC
    `;
  } else if (period === 'weekly') {
    query = `
      SELECT
        DATE_TRUNC('week', date)::text AS date,
        SUM(estimated_units) AS units,
        SUM(estimated_cost) AS cost
      FROM daily_estimates
      WHERE user_id = $1
        AND date >= CURRENT_DATE - INTERVAL '28 days'
      GROUP BY DATE_TRUNC('week', date)
      ORDER BY date ASC
    `;
  } else if (period === 'monthly') {
    query = `
      SELECT
        month::text AS date,
        units AS actual_units,
        bill_amount AS actual_cost,
        estimated_units,
        accuracy_pct
      FROM monthly_bills
      WHERE user_id = $1
      ORDER BY month DESC
      LIMIT 6
    `;
  } else {
    return res.status(400).json({ error: 'Invalid period. Use: daily, weekly, monthly' });
  }

  const result = await pool.query(query, params);
  return res.status(200).json({ period, data: result.rows });
};

/**
 * GET /api/dashboard/appliance-breakdown
 */
const getApplianceBreakdown = async (req, res) => {
  try {
    const userId = req.user.id;

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Try to get pre-computed estimates for this month
    const result = await pool.query(
      `SELECT
         a.name,
         a.icon,
         ae.estimated_units,
         ae.estimated_pct AS percentage,
         ae.estimated_cost
       FROM appliance_estimates ae
       JOIN appliances a ON a.id = ae.appliance_id
       WHERE ae.user_id = $1
         AND ae.month = $2
       ORDER BY ae.estimated_units DESC`,
      [userId, monthStartStr]
    );

    if (result.rows.length > 0) {
      return res.status(200).json({
        data: result.rows.map((row, idx) => ({
          name: row.name,
          icon: row.icon || getApplianceIcon(row.name),
          units: parseFloat(row.estimated_units),
          percentage: parseFloat(row.percentage),
          cost: parseFloat(row.estimated_cost),
          color: NEON_COLORS[idx % NEON_COLORS.length],
        })),
      });
    }

    // Fallback: compute on-the-fly from appliances table
    const appliancesResult = await pool.query(
      'SELECT * FROM appliances WHERE user_id = $1',
      [userId]
    );

    if (appliancesResult.rows.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const userResult = await pool.query('SELECT location FROM users WHERE id = $1', [userId]);
    const location = userResult.rows[0]?.location || 'Chennai';

    const month = new Date().getMonth();
    const temperature = await getLiveTemperature(location);
    const withEstimates = calculateMonthlyEstimates(appliancesResult.rows, month, location, null, temperature);
    const withPercentages = addPercentageBreakdown(withEstimates);

    return res.status(200).json({
      data: withPercentages
        .filter(a => a.estimated_monthly_kwh > 0)
        .map((a, idx) => ({
          name: a.name,
          icon: a.icon || getApplianceIcon(a.name),
          units: a.estimated_monthly_kwh,
          percentage: a.percentage,
          cost: a.estimated_cost,
          color: NEON_COLORS[idx % NEON_COLORS.length],
        })),
    });
  } catch (err) {
    console.error("Error in getApplianceBreakdown:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/dashboard/insights
 */
const getInsights = async (req, res) => {
  const userId = req.user.id;
  const insights = [];

  const applianceResult = await pool.query(
    `SELECT a.name, ae.estimated_pct, ae.estimated_cost
     FROM appliance_estimates ae
     JOIN appliances a ON a.id = ae.appliance_id
     WHERE ae.user_id = $1 AND ae.month = DATE_TRUNC('month', CURRENT_DATE)
     ORDER BY ae.estimated_units DESC LIMIT 1`,
    [userId]
  );

  if (applianceResult.rows[0]) {
    const top = applianceResult.rows[0];
    if (top.estimated_pct > 40) {
      insights.push({
        id: 'insight-top-consumer',
        type: 'warning',
        icon: '🔴',
        title: `${top.name} dominates your bill`,
        message: `${top.name} uses ${top.estimated_pct}% of your energy (₹${top.estimated_cost}/month)`,
        action: 'Reduce usage',
        action_url: '/coach',
      });
    }
  }

  const thisWeekResult = await pool.query(
    `SELECT COALESCE(SUM(estimated_units), 0) AS units
     FROM daily_estimates
     WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 days'`,
    [userId]
  );
  const lastWeekResult = await pool.query(
    `SELECT COALESCE(SUM(estimated_units), 0) AS units
     FROM daily_estimates
     WHERE user_id = $1
       AND date >= CURRENT_DATE - INTERVAL '13 days'
       AND date < CURRENT_DATE - INTERVAL '6 days'`,
    [userId]
  );

  const thisWeek = parseFloat(thisWeekResult.rows[0]?.units || 0);
  const lastWeek = parseFloat(lastWeekResult.rows[0]?.units || 0);

  if (lastWeek > 0 && thisWeek > lastWeek * 1.15) {
    insights.push({
      id: 'insight-weekly-increase',
      type: 'warning',
      icon: '📈',
      title: 'Usage trending up this week',
      message: `This week's usage is ${Math.round(((thisWeek / lastWeek) - 1) * 100)}% higher than last week`,
      action: 'View AI Coach',
      action_url: '/coach',
    });
  } else if (lastWeek > 0 && thisWeek < lastWeek * 0.95) {
    insights.push({
      id: 'insight-weekly-saving',
      type: 'success',
      icon: '✅',
      title: "You're saving energy this week!",
      message: `This week's usage is ${Math.round((1 - thisWeek / lastWeek) * 100)}% lower than last week`,
      action: 'Keep it up',
      action_url: '/leaderboard',
    });
  }

  const cssResult = await pool.query(
    `SELECT COUNT(*) AS count FROM css_applications WHERE user_id = $1`,
    [userId]
  );
  if (parseInt(cssResult.rows[0]?.count || 0) === 0) {
    insights.push({
      id: 'insight-css',
      type: 'tip',
      icon: '💡',
      title: 'Comfort-Safe Savings ready',
      message: 'You have personalized recommendations that could save ₹800+/month without discomfort',
      action: 'View Recommendations',
      action_url: '/coach',
    });
  }

  return res.status(200).json({ insights });
};

/**
 * GET /api/dashboard/peak-hours
 */
const getPeakHours = async (req, res) => {
  const hourlyPattern = [
    { hour: 0,  label: '12am', intensity: 0.3 },
    { hour: 1,  label: '1am',  intensity: 0.2 },
    { hour: 2,  label: '2am',  intensity: 0.2 },
    { hour: 3,  label: '3am',  intensity: 0.2 },
    { hour: 4,  label: '4am',  intensity: 0.2 },
    { hour: 5,  label: '5am',  intensity: 0.3 },
    { hour: 6,  label: '6am',  intensity: 0.7 },
    { hour: 7,  label: '7am',  intensity: 0.9 },
    { hour: 8,  label: '8am',  intensity: 0.8 },
    { hour: 9,  label: '9am',  intensity: 0.4 },
    { hour: 10, label: '10am', intensity: 0.3 },
    { hour: 11, label: '11am', intensity: 0.3 },
    { hour: 12, label: '12pm', intensity: 0.4 },
    { hour: 13, label: '1pm',  intensity: 0.5 },
    { hour: 14, label: '2pm',  intensity: 0.4 },
    { hour: 15, label: '3pm',  intensity: 0.5 },
    { hour: 16, label: '4pm',  intensity: 0.6 },
    { hour: 17, label: '5pm',  intensity: 0.7 },
    { hour: 18, label: '6pm',  intensity: 1.0 },
    { hour: 19, label: '7pm',  intensity: 1.0 },
    { hour: 20, label: '8pm',  intensity: 0.9 },
    { hour: 21, label: '9pm',  intensity: 0.8 },
    { hour: 22, label: '10pm', intensity: 0.6 },
    { hour: 23, label: '11pm', intensity: 0.4 },
  ];

  return res.status(200).json({
    pattern: hourlyPattern,
    peak_range: '6 PM – 9 PM',
    note: 'Based on your appliance usage pattern',
  });
};

module.exports = { getSummary, getUsage, getApplianceBreakdown, getInsights, getPeakHours };
