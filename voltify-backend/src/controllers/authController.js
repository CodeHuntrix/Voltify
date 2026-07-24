const bcrypt = require('bcrypt');
const { signToken } = require('../utils/jwt');
const authService = require('../services/authService');
const { validateSignup, validateLogin } = require('../utils/validators');
const emailService = require('../services/emailService');

const SALT_ROUNDS = 12;

// In-memory OTP store: email -> { otp, expiresAt }
const otpStore = new Map();

// Helper to generate a 6-digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * POST /api/auth/signup
 * Body: { name, email, password }
 */
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  const validation = validateSignup({ name, email, password });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const existing = await authService.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await authService.createUser({ name, email, passwordHash });

  // Generate and send OTP
  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(email.toLowerCase(), { otp, expiresAt });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[OTP] Generated verification code for ${email}: ${otp}`);
  }

  try {
    await emailService.sendOTPEmail(email, otp);
  } catch (error) {
    console.error('Failed to send verification OTP email:', error);
    // Continue signup but log error so server doesn't crash
  }

  const token = signToken(user.id);

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      tier: user.tier,
      coins: user.coins,
      streak_days: user.streak_days,
      onboarding_complete: user.onboarding_complete,
    },
  });
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  const validation = validateLogin({ email, password });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const user = await authService.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // OAuth users don't have a password
  if (!user.password_hash) {
    return res.status(401).json({ error: 'This account uses Google sign-in. Please use "Continue with Google".' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  await authService.updateLastActive(user.id);
  const token = signToken(user.id);

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      tier: user.tier,
      household_type: user.household_type,
      location: user.location,
      coins: user.coins,
      streak_days: user.streak_days,
      onboarding_complete: user.onboarding_complete,
    },
  });
};

/**
 * GET /api/auth/me
 * Returns the current authenticated user
 */
const me = async (req, res) => {
  const user = await authService.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.status(200).json(user);
};

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 */
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const record = otpStore.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ error: 'No OTP requested for this email. Please sign up or resend code.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
  }

  const isDevBypass = process.env.NODE_ENV === 'development' && otp.trim() === '123456';
  if (record.otp !== otp.trim() && !isDevBypass) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
  }

  // Success: Clear the OTP from store
  otpStore.delete(email.toLowerCase());

  return res.status(200).json({ success: true, message: 'OTP verified successfully' });
};

/**
 * POST /api/auth/resend-otp
 * Body: { email }
 */
const resendOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(email.toLowerCase(), { otp, expiresAt });

  try {
    await emailService.sendOTPEmail(email, otp);
    return res.status(200).json({ success: true, message: 'OTP resent to your email.' });
  } catch (error) {
    console.error('Failed to resend verification OTP email:', error);
    return res.status(500).json({ error: 'Failed to send OTP email. Please try again later.' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await authService.getUserByEmail(email);
  if (user) {
    // Generate a secure reset link (mock frontend endpoint for password reset)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?email=${encodeURIComponent(email)}`;
    
    try {
      await emailService.sendForgotPasswordEmail(email, resetLink);
    } catch (error) {
      console.error('Failed to send forgot password email:', error);
    }
  }

  // Always return success to prevent email enumeration (security best practice)
  return res.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent.' });
};

/**
 * POST /api/auth/oauth/google
 * Called from frontend when Google OAuth completes via redirect
 * Body: { token, user } — passed from the backend Google callback redirect
 */
const oauthCallback = async (req, res) => {
  const { name, email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required for OAuth login' });
  }

  const user = await authService.findOrCreateOAuthUser({ name: name || email.split('@')[0], email, provider: 'google' });
  await authService.updateLastActive(user.id);
  const token = signToken(user.id);

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      tier: user.tier,
      coins: user.coins,
      streak_days: user.streak_days,
      onboarding_complete: user.onboarding_complete,
    },
  });
};

/**
 * POST /api/auth/reset-password
 * Body: { email, password }
 */
const resetPassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const user = await authService.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await authService.updatePassword(user.id, passwordHash);

  return res.status(200).json({ success: true, message: 'Password has been reset successfully.' });
};

module.exports = { signup, login, me, verifyOTP, resendOTP, forgotPassword, oauthCallback, resetPassword };
