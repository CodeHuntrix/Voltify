const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/leaderboardController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/:type', getLeaderboard);

module.exports = router;
