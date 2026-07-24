const express = require('express');
const router = express.Router();
const { getStats, getChallenge, checkChallenge, getShop, redeemItem, dailyCheckin } = require('../controllers/gamificationController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/stats',            getStats);
router.get('/challenge',        getChallenge);
router.post('/check-challenge', checkChallenge);
router.get('/shop',             getShop);
router.post('/redeem',          redeemItem);
router.post('/check-in',        dailyCheckin);

module.exports = router;
