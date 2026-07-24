import express from 'express';
const router = express.Router();
import { getStats, getChallenge, checkChallenge, getShop, redeemItem, dailyCheckin } from '../controllers/gamificationController.js';

router.get('/stats', getStats);
router.get('/challenge', getChallenge);
router.post('/check-challenge', checkChallenge);
router.get('/shop', getShop);
router.post('/redeem', redeemItem);
router.post('/check-in', dailyCheckin);

export default router;
