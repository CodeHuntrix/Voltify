const pool = require('../config/db');
const {
  generatePredictions,
  detectBillShock,
  calculateWhatIf,
} = require('../services/estimationEngine');
const { cssRecommendations } = require('../utils/mockData');
const coinService = require('../services/coinService');
const notificationService = require('../services/notificationService');
const llmService = require('../services/llmService');

/**
 * GET /api/coach/predictions
 */
const getPredictions = async (req, res) => {
  const userId = req.user.id;

  const last7Result = await pool.query(
    `SELECT date, estimated_units
     FROM daily_estimates
     WHERE user_id = $1
     ORDER BY date DESC LIMIT 7`,
    [userId]
  );

  const userResult = await pool.query(
    'SELECT location FROM users WHERE id = $1',
    [userId]
  );
  const location = userResult.rows[0]?.location || 'Chennai';

  const predictions = generatePredictions(last7Result.rows, location);

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const thisMonthEstimatesResult = await pool.query(
    `SELECT estimated_units FROM daily_estimates
     WHERE user_id = $1 AND date >= $2`,
    [userId, monthStartStr]
  );

  const lastBillResult = await pool.query(
    `SELECT bill_amount FROM monthly_bills WHERE user_id = $1 ORDER BY month DESC LIMIT 1`,
    [userId]
  );

  const daysElapsed = new Date().getDate();
  const billShock = detectBillShock(
    thisMonthEstimatesResult.rows,
    lastBillResult.rows[0]?.bill_amount,
    daysElapsed,
    location
  );

  return res.status(200).json({ predictions, bill_shock: billShock });
};

/**
 * GET /api/coach/actual-vs-predicted
 */
const getActualVsPredicted = async (req, res) => {
  const userId = req.user.id;

  const billsResult = await pool.query(
    `SELECT
       month,
       units AS actual_units,
       bill_amount AS actual_cost,
       estimated_units,
       accuracy_pct
     FROM monthly_bills
     WHERE user_id = $1
     ORDER BY month ASC
     LIMIT 6`,
    [userId]
  );

  const hasMultipleBills = billsResult.rows.length >= 2;

  return res.status(200).json({
    data: billsResult.rows,
    has_multiple_bills: hasMultipleBills,
    message: hasMultipleBills
      ? null
      : 'Upload your next bill to see prediction accuracy over time',
  });
};

/**
 * GET /api/coach/alerts
 */
const getAlerts = async (req, res) => {
  const userId = req.user.id;
  const alerts = [];

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

  if (lastWeek > 0 && thisWeek > lastWeek * 1.25) {
    alerts.push({
      id: 'alert-weekly-spike',
      type: 'usage_spike',
      severity: 'medium',
      title: '⚠ Usage Alert',
      message: `This week's estimate is ${Math.round(((thisWeek / lastWeek) - 1) * 100)}% higher than last week`,
      likely_cause: 'Higher AC or geyser usage',
      predicted_impact_rs: parseFloat(((thisWeek - lastWeek) * 8).toFixed(0)),
    });
  }

  const billTrendResult = await pool.query(
    `SELECT month, bill_amount FROM monthly_bills
     WHERE user_id = $1 ORDER BY month DESC LIMIT 3`,
    [userId]
  );

  if (billTrendResult.rows.length >= 3) {
    const bills = billTrendResult.rows.map(b => parseFloat(b.bill_amount));
    if (bills[0] > bills[1] && bills[1] > bills[2]) {
      alerts.push({
        id: 'alert-bill-trend',
        type: 'bill_trend',
        severity: 'medium',
        title: '📊 Bill Trend Alert',
        message: `Your bills have been increasing for 3 consecutive months`,
        likely_cause: 'Gradual increase in AC or appliance usage',
        predicted_impact_rs: Math.round(bills[0] - bills[2]),
      });
    }
  }

  alerts.push({
    id: 'alert-locked-realtime',
    type: 'locked_feature',
    severity: null,
    title: '🔒 Real-time Anomaly Detection',
    message: 'Available on Tier 2 (Smart Meter) — detect appliance malfunctions 48 hrs early',
    is_locked: true,
  });

  return res.status(200).json({ alerts });
};

/**
 * GET /api/coach/css-recommendations
 */
const getCSSRecommendations = async (req, res) => {
  const userId = req.user.id;

  const appliedResult = await pool.query(
    `SELECT appliance FROM css_applications WHERE user_id = $1`,
    [userId]
  );
  const appliedAppliances = appliedResult.rows.map(r => r.appliance);

  const recommendations = cssRecommendations.map(rec => ({
    ...rec,
    already_applied: appliedAppliances.includes(rec.appliance),
  }));

  const totalMonthlySavings = recommendations.reduce(
    (sum, r) => sum + (r.already_applied ? 0 : r.monthly_savings_rs), 0
  );

  return res.status(200).json({
    recommendations,
    total_potential_savings_rs: totalMonthlySavings,
    total_annual_savings_rs: totalMonthlySavings * 12,
  });
};

/**
 * POST /api/coach/css-apply
 */
const applyCSSRecommendation = async (req, res) => {
  const { recommendation_id, appliance, setting_applied } = req.body;
  const userId = req.user.id;

  if (!appliance || !setting_applied) {
    return res.status(400).json({ error: 'appliance and setting_applied are required' });
  }

  const rec = cssRecommendations.find(r => r.id === recommendation_id || r.appliance === appliance);
  if (!rec) {
    return res.status(404).json({ error: 'Recommendation not found' });
  }

  const existing = await pool.query(
    `SELECT id FROM css_applications WHERE user_id = $1 AND appliance = $2`,
    [userId, appliance]
  );

  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'You have already applied this recommendation' });
  }

  await pool.query(
    `INSERT INTO css_applications (user_id, appliance, setting_applied, savings_pct, comfort_pct, monthly_savings)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, appliance, setting_applied, rec.savings_pct, rec.comfort_pct, rec.monthly_savings_rs]
  );

  const coinsToAward = Math.round(rec.monthly_savings_rs / 10);
  const coinResult = await coinService.awardCoins(
    userId, coinsToAward, 'earned',
    `Applied CSS: ${appliance} set to ${setting_applied}`
  );

  await notificationService.create(userId, {
    type: 'css_applied',
    title: '💡 Savings Setting Applied!',
    message: `${appliance} optimized. Expected savings: ₹${rec.monthly_savings_rs}/month. You earned ${coinResult.awarded} coins!`,
    action_url: '/coach',
  });

  return res.status(200).json({
    success: true,
    message: `${appliance} recommendation applied successfully`,
    coins_earned: coinResult.awarded,
    new_coin_balance: coinResult.new_balance,
    expected_monthly_savings: rec.monthly_savings_rs,
  });
};

/**
 * GET /api/coach/whatif
 */
const whatIf = async (req, res) => {
  const { appliance, change_type, change_value } = req.query;
  const userId = req.user.id;

  if (!appliance || !change_type || !change_value) {
    return res.status(400).json({ error: 'appliance, change_type, and change_value are required' });
  }

  const appliancesResult = await pool.query(
    'SELECT * FROM appliances WHERE user_id = $1',
    [userId]
  );

  const userResult = await pool.query(
    'SELECT location FROM users WHERE id = $1',
    [userId]
  );
  const location = userResult.rows[0]?.location || 'Chennai';

  const result = calculateWhatIf(
    appliancesResult.rows,
    appliance,
    change_type,
    parseFloat(change_value),
    location
  );

  if (result.error) {
    return res.status(404).json({ error: result.error });
  }

  return res.status(200).json(result);
};

/**
 * POST /api/coach/chat
 * Conversations with personal coach chatbot "Volt"
 */
const chatWithVolt = async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const reply = await llmService.chatWithVolt(messages);
    return res.status(200).json({
      success: true,
      reply
    });
  } catch (err) {
    console.error('[coachController] Chatbot Volt failed:', err);
    return res.status(500).json({ error: `Failed to prompt Volt: ${err.message}` });
  }
};

module.exports = { getPredictions, getActualVsPredicted, getAlerts, getCSSRecommendations, applyCSSRecommendation, whatIf, chatWithVolt };
