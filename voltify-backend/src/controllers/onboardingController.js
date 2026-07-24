const pool = require('../config/db');
const {
  calculateMonthlyEstimates,
  addPercentageBreakdown,
  calculateMatchPercentage,
  generateAndSaveDailyEstimates,
  generateAndSaveApplianceEstimates,
} = require('../services/estimationEngine');
const { getLiveTemperature } = require('../services/weatherService');
const { validateAppliance, validateBill } = require('../utils/validators');
const notificationService = require('../services/notificationService');
const challengeService = require('../services/challengeService');
const coinService = require('../services/coinService');
// unpdf is used instead of pdf-parse - it is serverless/edge compatible (no DOMMatrix/canvas deps)
const llmService = require('../services/llmService');

/**
 * POST /api/onboarding/profile
 * Step 1: Save household profile
 */
const saveProfile = async (req, res) => {
  const { household_type, location, home_type, appliance_count } = req.body;

  const validHouseholdTypes = ['bachelor', 'family', 'large_family', 'organization'];
  if (!household_type || !validHouseholdTypes.includes(household_type)) {
    return res.status(400).json({
      error: `household_type must be one of: ${validHouseholdTypes.join(', ')}`,
    });
  }

  const validLocations = ['Chennai', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Kolkata'];
  if (!location || !validLocations.includes(location.trim())) {
    return res.status(400).json({
      error: `location must be one of: ${validLocations.join(', ')}`,
    });
  }

  if (!appliance_count || isNaN(appliance_count) || appliance_count < 1 || appliance_count > 50) {
    return res.status(400).json({ error: 'Appliance count must be between 1 and 50' });
  }

  const validHomeTypes = ['apartment', 'house', 'villa'];
  if (home_type && !validHomeTypes.includes(home_type)) {
    return res.status(400).json({ error: `home_type must be one of: ${validHomeTypes.join(', ')}` });
  }

  await pool.query(
    `UPDATE users
     SET household_type = $1, location = $2, home_type = $3, appliance_count = $4
     WHERE id = $5`,
    [household_type, location.trim(), home_type || null, parseInt(appliance_count), req.user.id]
  );

  return res.status(200).json({
    success: true,
    message: 'Profile saved successfully',
    data: { household_type, location, home_type, appliance_count: parseInt(appliance_count) },
  });
};

/**
 * POST /api/onboarding/parse-bill
 * Parse PDF electricity statement with Groq Cloud LLM / Fallback Regex
 */
const parseBillPDF = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }

  console.log('[onboardingController] Received file:', req.file.originalname, 'size:', req.file.size);

  try {
    const dataUint8 = new Uint8Array(req.file.buffer);
    // Use unpdf - serverless-safe PDF parser (no DOMMatrix/canvas deps)
    const { extractText } = await import('unpdf');
    const rawPdf = await extractText(dataUint8);
    const pdfText = Array.isArray(rawPdf) ? rawPdf.join('\n') : rawPdf;

    // Use Groq LLM service to parse the bill text
    const parsedData = await llmService.parseBillText(pdfText);

    return res.status(200).json({
      success: true,
      message: 'Utility bill statement parsed successfully',
      data: parsedData
    });
  } catch (err) {
    console.error('[onboardingController] PDF parsing failed:', err);
    return res.status(500).json({ error: `Failed to parse PDF: ${err.message}` });
  }
};

/**
 * POST /api/onboarding/bill
 * Step 2: Save monthly bill
 */
const saveBill = async (req, res) => {
  const { bill_amount, units, month, prev_bills } = req.body;

  const validation = validateBill({ bill_amount, units });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const billMonth = month
    ? new Date(month)
    : (() => { const d = new Date(); d.setDate(1); return d; })();

  const billMonthStr = billMonth.toISOString().split('T')[0];

  await pool.query(
    `INSERT INTO monthly_bills (user_id, month, bill_amount, units)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [req.user.id, billMonthStr, parseFloat(bill_amount), parseFloat(units)]
  );

  if (prev_bills && Array.isArray(prev_bills)) {
    for (const prevBill of prev_bills) {
      if (prevBill.bill_amount && prevBill.units && prevBill.month) {
        const prevMonthStr = new Date(prevBill.month).toISOString().split('T')[0];
        await pool.query(
          `INSERT INTO monthly_bills (user_id, month, bill_amount, units)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [req.user.id, prevMonthStr, parseFloat(prevBill.bill_amount), parseFloat(prevBill.units)]
        );
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Bill saved successfully',
    data: { bill_amount: parseFloat(bill_amount), units: parseFloat(units), month: billMonthStr },
  });
};

/**
 * POST /api/onboarding/appliances
 * Step 3: Save all appliances + run estimation engine
 */
const saveAppliances = async (req, res) => {
  const { appliances } = req.body;

  if (!appliances || !Array.isArray(appliances) || appliances.length === 0) {
    return res.status(400).json({ error: 'At least one appliance is required' });
  }

  for (const appliance of appliances) {
    const validation = validateAppliance(appliance);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
  }

  const userResult = await pool.query(
    'SELECT location FROM users WHERE id = $1',
    [req.user.id]
  );
  const location = userResult.rows[0]?.location || 'Chennai';

  await pool.query('DELETE FROM appliances WHERE user_id = $1', [req.user.id]);

  const savedAppliances = [];
  for (const appliance of appliances) {
    const result = await pool.query(
      `INSERT INTO appliances (user_id, name, power_kw, avg_hours_day, seasonality, type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        appliance.name.trim(),
        parseFloat(appliance.power_kw),
        parseFloat(appliance.avg_hours_day),
        appliance.seasonality || 'whole_year',
        appliance.type || null,
      ]
    );
    savedAppliances.push(result.rows[0]);
  }

  const month = new Date().getMonth();
  const billResult = await pool.query(
    `SELECT units FROM monthly_bills WHERE user_id = $1 ORDER BY month DESC LIMIT 1`,
    [req.user.id]
  );
  const actualUnits = billResult.rows[0]?.units || null;

  // Fetch live temperature for weather-calibrated estimation
  const temperature = await getLiveTemperature(location);

  // Uncalibrated estimates for input validation match score
  const uncalibratedEstimates = calculateMonthlyEstimates(savedAppliances, month, location, null, temperature);
  const uncalibratedMonthlyUnits = uncalibratedEstimates.reduce(
    (sum, a) => sum + a.estimated_monthly_kwh, 0
  );
  const matchPct = actualUnits
    ? calculateMatchPercentage(uncalibratedMonthlyUnits, actualUnits)
    : null;

  // Calibrated estimates for saving and dashboard telemetry
  const withEstimates = calculateMonthlyEstimates(savedAppliances, month, location, actualUnits, temperature);
  const withPercentages = addPercentageBreakdown(withEstimates);

  const estimatedMonthlyUnits = withPercentages.reduce(
    (sum, a) => sum + a.estimated_monthly_kwh, 0
  );

  if (actualUnits) {
    await pool.query(
      `UPDATE monthly_bills
       SET estimated_units = $1, accuracy_pct = $2
       WHERE user_id = $3
       AND month = (SELECT MAX(month) FROM monthly_bills WHERE user_id = $3)`,
      [parseFloat(uncalibratedMonthlyUnits.toFixed(3)), matchPct, req.user.id]
    );
  }

  await generateAndSaveDailyEstimates(req.user.id, savedAppliances, location, 30);
  await generateAndSaveApplianceEstimates(req.user.id, savedAppliances, location);

  await pool.query(
    `UPDATE users SET onboarding_complete = TRUE WHERE id = $1`,
    [req.user.id]
  );

  // Award onboarding complete bonus coins
  await coinService.awardCoins(req.user.id, 150, 'bonus', 'Onboarding Complete Bonus');

  await challengeService.createWeeklyChallenge(req.user.id, estimatedMonthlyUnits);

  await notificationService.create(req.user.id, {
    type: 'welcome',
    title: '⚡ Welcome to VOLTIFY!',
    message: `Your energy profile is ready. You have ${savedAppliances.length} appliances tracked.`,
    action_url: '/dashboard',
  });

  const breakdown = withPercentages.map((a) => ({
    name: a.name,
    estimated_kwh: a.estimated_monthly_kwh,
    percentage: a.percentage,
    estimated_cost: a.estimated_cost,
  }));

  return res.status(200).json({
    success: true,
    message: 'Appliances saved and estimation complete',
    data: {
      appliance_count: savedAppliances.length,
      estimated_monthly_units: parseFloat(estimatedMonthlyUnits.toFixed(3)),
      actual_monthly_units: actualUnits,
      match_percentage: matchPct,
      breakdown,
    },
  });
};

/**
 * POST /api/onboarding/validate
 * Live validation
 */
const validate = async (req, res) => {
  const { appliances } = req.body;

  if (!appliances || !Array.isArray(appliances)) {
    return res.status(400).json({ error: 'Appliances array required' });
  }

  const userResult = await pool.query(
    'SELECT location FROM users WHERE id = $1',
    [req.user.id]
  );
  const location = userResult.rows[0]?.location || 'Chennai';

  const month = new Date().getMonth();
  const temperature = await getLiveTemperature(location);
  const withEstimates = calculateMonthlyEstimates(appliances, month, location, null, temperature);
  const estimatedUnits = withEstimates.reduce((sum, a) => sum + a.estimated_monthly_kwh, 0);

  const billResult = await pool.query(
    `SELECT units FROM monthly_bills WHERE user_id = $1 ORDER BY month DESC LIMIT 1`,
    [req.user.id]
  );
  const actualUnits = billResult.rows[0]?.units || null;
  const matchPct = actualUnits ? calculateMatchPercentage(estimatedUnits, actualUnits) : null;

  return res.status(200).json({
    estimated_units: parseFloat(estimatedUnits.toFixed(3)),
    actual_units: actualUnits,
    match_percentage: matchPct,
    is_good_match: matchPct !== null ? matchPct >= 85 : null,
  });
};

module.exports = { saveProfile, saveBill, saveAppliances, validate, parseBillPDF };
