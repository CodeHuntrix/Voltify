const express = require('express');
const router = express.Router();
const { getSummary, getUsage, getApplianceBreakdown, getInsights, getPeakHours } = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/summary',             getSummary);
router.get('/usage',               getUsage);
router.get('/appliance-breakdown', getApplianceBreakdown);
router.get('/insights',            getInsights);
router.get('/peak-hours',          getPeakHours);

module.exports = router;
