const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const authService = require('../services/authService');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name  = profile.displayName || email?.split('@')[0] || 'User';

        if (!email) {
          return done(new Error('No email returned from Google'), null);
        }

        const user = await authService.findOrCreateOAuthUser({ name, email, provider: 'google' });
        await authService.updateLastActive(user.id);
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
