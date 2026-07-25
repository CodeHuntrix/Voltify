// ==============================================================================
// Voltify Backend: DISCOM API Routes
// Proxy routes to the standalone Discom microservice + AI anomaly detection
// ==============================================================================

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const pool = require('../config/db');
const discomService = require('../services/discomService');

// ── Ensure columns exist (idempotent migration) ───────────────────────────
;(async () => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS consumer_no VARCHAR(50)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS meter_type VARCHAR(20) DEFAULT 'basic'`);
    console.log('[DISCOM] users table migration complete (consumer_no, meter_type columns ready)');
  } catch (err) {
    // Silently ignore if mock DB or already exists
    console.log('[DISCOM] Migration skipped (likely mock DB):', err.message);
  }
})();


/**
 * GET /api/discom/customers
 * Returns all seeded mock DISCOM customers
 */
router.get('/customers', requireAuth, async (req, res) => {
  try {
    const customers = await discomService.getAllCustomers();
    res.json(customers);
  } catch (err) {
    res.status(502).json({ error: `DISCOM service unavailable: ${err.message}` });
  }
});

/**
 * GET /api/discom/verify/:consumer_no
 * Verify that a consumer number exists in the DISCOM system
 * Used during onboarding step 2 smart meter setup
 */
router.get('/verify/:consumer_no', requireAuth, async (req, res) => {
  try {
    const { consumer_no } = req.params;
    const customer = await discomService.getCustomerByConsumerNo(consumer_no);
    res.json({
      valid: true,
      consumer_no: customer.consumer_no,
      meter_no: customer.meter_no,
      consumer_name: customer.consumer_name,
      tariff_type: customer.tariff_type,
      connection_status: customer.connection_status,
    });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('404')) {
      return res.status(404).json({ valid: false, error: 'Consumer number not found in DISCOM registry' });
    }
    res.status(502).json({ error: `DISCOM service unavailable: ${err.message}` });
  }
});

/**
 * POST /api/discom/link
 * Save the user's consumer_no to their profile (called after onboarding step 2 verify)
 */
router.post('/link', requireAuth, async (req, res) => {
  try {
    const { consumer_no } = req.body;
    if (!consumer_no) return res.status(400).json({ error: 'consumer_no is required' });

    // Verify against DISCOM first
    const customer = await discomService.getCustomerByConsumerNo(consumer_no);
    
    // Save to users table
    await pool.query(
      'UPDATE users SET consumer_no = $1, meter_type = $2 WHERE id = $3',
      [consumer_no, 'smart', req.user.id]
    );

    res.json({
      success: true,
      consumer_no: customer.consumer_no,
      meter_no: customer.meter_no,
      consumer_name: customer.consumer_name,
      message: 'Smart meter linked successfully',
    });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('404')) {
      return res.status(404).json({ error: 'Consumer number not found in DISCOM registry' });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/discom/me
 * Get current user's DISCOM/smart meter info
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT consumer_no, meter_type FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user?.consumer_no) {
      return res.json({ linked: false, consumer_no: null, meter_no: null });
    }
    const customer = await discomService.getCustomerByConsumerNo(user.consumer_no);
    res.json({
      linked: true,
      consumer_no: user.consumer_no,
      meter_no: customer.meter_no,
      consumer_name: customer.consumer_name,
      tariff_type: customer.tariff_type,
    });
  } catch (err) {
    res.json({ linked: false, consumer_no: null, meter_no: null, error: err.message });
  }
});

/**
 * GET /api/discom/live
 * Returns the latest 5-min smart meter reading for the authenticated user
 */
router.get('/live', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT consumer_no FROM users WHERE id = $1', [req.user.id]);
    const consumer_no = result.rows[0]?.consumer_no;
    if (!consumer_no) return res.status(404).json({ error: 'No smart meter linked to this account' });
    
    const customer = await discomService.getCustomerByConsumerNo(consumer_no);
    const reading = await discomService.getLatestReading(customer.meter_no);
    res.json(reading);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * GET /api/discom/chart?period=hourly|daily|weekly
 * Returns chart data for dashboard Energy Consumption Index
 * Smart meter users get hourly/daily/weekly; Tier 1 users get daily/weekly/monthly
 */
router.get('/chart', requireAuth, async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    const result = await pool.query('SELECT consumer_no FROM users WHERE id = $1', [req.user.id]);
    const consumer_no = result.rows[0]?.consumer_no;
    if (!consumer_no) return res.status(404).json({ error: 'No smart meter linked to this account' });

    let data;
    if (period === 'hourly') {
      data = await discomService.getHourlyForConsumer(consumer_no);
    } else if (period === 'daily') {
      data = await discomService.getDailyForConsumer(consumer_no, 30);
    } else if (period === 'weekly') {
      data = await discomService.getWeeklyForConsumer(consumer_no, 12);
    } else {
      return res.status(400).json({ error: 'period must be hourly, daily, or weekly' });
    }

    res.json({ period, data });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/**
 * GET /api/discom/anomaly
 * Run Isolation Forest anomaly detection on the user's smart meter history
 */
router.get('/anomaly', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT consumer_no FROM users WHERE id = $1', [req.user.id]);
    const consumer_no = result.rows[0]?.consumer_no;
    if (!consumer_no) return res.status(404).json({ error: 'No smart meter linked to this account' });

    const anomalyReport = await discomService.detectAnomalies(consumer_no);
    res.json(anomalyReport);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
