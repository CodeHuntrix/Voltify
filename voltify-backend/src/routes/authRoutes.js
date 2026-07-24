const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { signToken } = require('../utils/jwt');
const { signup, login, me, verifyOTP, resendOTP, forgotPassword, oauthCallback, resetPassword } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Public routes (no token needed)
router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// OAuth callback route — frontend posts { name, email } after Google OAuth
router.post('/oauth/google', oauthCallback);

// Real Google OAuth redirect and callback routes
router.get('/google', (req, res, next) => {
  const state = req.query.state || '';
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: state
  })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    const state = req.query.state || '';
    passport.authenticate('google', { 
      failureRedirect: `${state || process.env.FRONTEND_URL || 'http://localhost:5173'}/login`, 
      session: false 
    })(req, res, next);
  },
  (req, res) => {
    const token = signToken(req.user.id);
    const userStr = JSON.stringify({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      tier: req.user.tier,
      coins: req.user.coins,
      streak_days: req.user.streak_days,
      onboarding_complete: req.user.onboarding_complete,
    });
    const frontendUrl = req.query.state || process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/oauth-success?token=${token}&user=${encodeURIComponent(userStr)}`);
  }
);

// Protected routes (token required)
router.get('/me', requireAuth, me);

module.exports = router;
