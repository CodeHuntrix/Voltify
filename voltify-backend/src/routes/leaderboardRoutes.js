import express from 'express';
const router = express.Router();
import { getLeaderboard } from '../controllers/leaderboardController.js';

router.get('/:type', getLeaderboard);

export default router;
