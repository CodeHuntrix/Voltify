const pool = require('../config/db');
const {
  generateAndSaveDailyEstimates,
  generateAndSaveApplianceEstimates,
  calculateMatchPercentage,
} = require('../services/estimationEngine');
const { validateAppliance, validateBill } = require('../utils/validators');

/**
 * GET /api/settings/appliances
 */
const getAppliances = async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, power_kw, avg_hours_day, seasonality, type, created_at
     FROM appliances WHERE user_id = $1 ORDER BY name ASC`,
    [req.user.id]
  );
  return res.status(200).json({ appliances: result.rows });
};

/**
 * PUT /api/settings/appliances/:id
 */
const updateAppliance = async (req, res) => {
  const { power_kw, avg_hours_day, seasonality, type } = req.body;
  const { id } = req.params;

  const existing = await pool.query(
    'SELECT * FROM appliances WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );
  if (!existing.rows[0]) {
    return res.status(404).json({ error: 'Appliance not found' });
  }

  const appliance = existing.rows[0];

  const newPower    = power_kw     ? parseFloat(power_kw)     : appliance.power_kw;
  const newHours    = avg_hours_day ? parseFloat(avg_hours_day) : appliance.avg_hours_day;
  const newSeason   = seasonality  || appliance.seasonality;
  const newType     = type !== undefined ? type : appliance.type;

  const validation = validateAppliance({ name: appliance.name, power_kw: newPower, avg_hours_day: newHours });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  await pool.query(
    `UPDATE appliances SET power_kw = $1, avg_hours_day = $2, seasonality = $3, type = $4
     WHERE id = $5`,
    [newPower, newHours, newSeason, newType, id]
  );

  const allAppliances = await pool.query('SELECT * FROM appliances WHERE user_id = $1', [req.user.id]);
  const userResult = await pool.query('SELECT location FROM users WHERE id = $1', [req.user.id]);
  const location = userResult.rows[0]?.location || 'Chennai';

  await generateAndSaveDailyEstimates(req.user.id, allAppliances.rows, location, 30);
  await generateAndSaveApplianceEstimates(req.user.id, allAppliances.rows, location);

  return res.status(200).json({ success: true, message: 'Appliance updated and estimates recalculated' });
};

/**
 * DELETE /api/settings/appliances/:id
 */
const deleteAppliance = async (req, res) => {
  const { id } = req.params;

  const existing = await pool.query(
    'SELECT * FROM appliances WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );
  if (!existing.rows[0]) {
    return res.status(404).json({ error: 'Appliance not found' });
  }

  await pool.query('DELETE FROM appliances WHERE id = $1', [id]);

  const allAppliances = await pool.query('SELECT * FROM appliances WHERE user_id = $1', [req.user.id]);
  if (allAppliances.rows.length > 0) {
    const userResult = await pool.query('SELECT location FROM users WHERE id = $1', [req.user.id]);
    const location = userResult.rows[0]?.location || 'Chennai';
    await generateAndSaveDailyEstimates(req.user.id, allAppliances.rows, location, 30);
  }

  return res.status(200).json({ success: true, message: 'Appliance deleted' });
};

/**
 * POST /api/settings/appliances
 */
const addAppliance = async (req, res) => {
  const { name, power_kw, avg_hours_day, seasonality, type } = req.body;

  const validation = validateAppliance({ name, power_kw, avg_hours_day, seasonality });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const result = await pool.query(
    `INSERT INTO appliances (user_id, name, power_kw, avg_hours_day, seasonality, type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, name.trim(), parseFloat(power_kw), parseFloat(avg_hours_day), seasonality || 'whole_year', type || null]
  );

  const allAppliances = await pool.query('SELECT * FROM appliances WHERE user_id = $1', [req.user.id]);
  const userResult = await pool.query('SELECT location FROM users WHERE id = $1', [req.user.id]);
  const location = userResult.rows[0]?.location || 'Chennai';
  await generateAndSaveDailyEstimates(req.user.id, allAppliances.rows, location, 30);
  await generateAndSaveApplianceEstimates(req.user.id, allAppliances.rows, location);

  return res.status(201).json({ success: true, appliance: result.rows[0] });
};

/**
 * GET /api/settings/bills
 */
const getBills = async (req, res) => {
  const result = await pool.query(
    `SELECT id, month, units, bill_amount, estimated_units, accuracy_pct, created_at
     FROM monthly_bills WHERE user_id = $1 ORDER BY month DESC LIMIT 12`,
    [req.user.id]
  );
  return res.status(200).json({ bills: result.rows });
};

/**
 * POST /api/settings/bills/upload
 */
const uploadBill = async (req, res) => {
  const { bill_amount, units, month } = req.body;

  const validation = validateBill({ bill_amount, units });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const billMonthStr = month
    ? new Date(month).toISOString().split('T')[0]
    : (() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; })();

  const appliancesResult = await pool.query('SELECT * FROM appliances WHERE user_id = $1', [req.user.id]);
  const userResult = await pool.query('SELECT location FROM users WHERE id = $1', [req.user.id]);
  const location = userResult.rows[0]?.location || 'Chennai';

  const { calculateMonthlyEstimates: calcMonthly } = require('../services/estimationEngine');
  const monthIndex = new Date(billMonthStr).getMonth();
  const withEstimates = calcMonthly(appliancesResult.rows, monthIndex, location);
  const estimatedUnits = withEstimates.reduce((sum, a) => sum + a.estimated_monthly_kwh, 0);
  const accuracy = calculateMatchPercentage(estimatedUnits, parseFloat(units));

  await pool.query(
    `INSERT INTO monthly_bills (user_id, month, bill_amount, units, estimated_units, accuracy_pct)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING`,
    [req.user.id, billMonthStr, parseFloat(bill_amount), parseFloat(units), parseFloat(estimatedUnits.toFixed(3)), accuracy]
  );

  // Recalibrate daily and appliance estimates with the newly uploaded bill!
  await generateAndSaveDailyEstimates(req.user.id, appliancesResult.rows, location, 30);
  await generateAndSaveApplianceEstimates(req.user.id, appliancesResult.rows, location);

  return res.status(200).json({
    success: true,
    message: 'Bill uploaded and estimates recalibrated',
    accuracy_pct: accuracy,
    estimated_units: parseFloat(estimatedUnits.toFixed(3)),
    actual_units: parseFloat(units),
  });
};

/**
 * PUT /api/settings/notifications
 */
const updateNotificationSettings = async (req, res) => {
  const settings = req.body;
  const validKeys = ['daily_digest', 'weekly_report', 'bill_alerts', 'challenge_reminders', 'streak_reminders', 'coin_alerts'];

  const filteredSettings = {};
  for (const key of validKeys) {
    if (settings[key] !== undefined) {
      filteredSettings[key] = Boolean(settings[key]);
    }
  }

  await pool.query(
    `UPDATE users
     SET notification_settings = notification_settings || $1::jsonb
     WHERE id = $2`,
    [JSON.stringify(filteredSettings), req.user.id]
  );

  return res.status(200).json({ success: true, updated_settings: filteredSettings });
};

/**
 * DELETE /api/settings/account
 */
const deleteAccount = async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
  return res.status(200).json({ success: true, message: 'Account deleted successfully' });
};

module.exports = {
  getAppliances, updateAppliance, deleteAppliance, addAppliance,
  getBills, uploadBill, updateNotificationSettings, deleteAccount,
};
