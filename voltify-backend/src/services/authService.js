const pool = require('../config/db');

/**
 * Gets a user by email (returns full row including password_hash)
 */
const getUserByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  return result.rows[0] || null;
};

/**
 * Gets a user by ID (excludes password_hash)
 */
const getUserById = async (id) => {
  const result = await pool.query(
    `SELECT id, name, email, tier, household_type, location, home_type,
            appliance_count, coins, streak_days, last_active,
            onboarding_complete, notification_settings, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Creates a new user with email/password
 */
const createUser = async ({ name, email, passwordHash }) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, tier, coins, streak_days, onboarding_complete, created_at`,
    [name.trim(), email.toLowerCase().trim(), passwordHash]
  );
  return result.rows[0];
};

/**
 * Creates or finds a user from OAuth (Google)
 */
const findOrCreateOAuthUser = async ({ name, email, provider }) => {
  // Check if user exists
  let user = await getUserByEmail(email);
  if (user) return user;

  // Create new user without password_hash (OAuth user)
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, tier, coins, streak_days, onboarding_complete, created_at`,
    [name.trim(), email.toLowerCase().trim(), null]
  );
  return result.rows[0];
};

/**
 * Updates the last_active date for a user (called on every login)
 */
const updateLastActive = async (userId) => {
  await pool.query(
    `UPDATE users SET last_active = CURRENT_DATE WHERE id = $1`,
    [userId]
  );
};

/**
 * Updates the user's password hash (called during password resets)
 */
const updatePassword = async (userId, passwordHash) => {
  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [passwordHash, userId]
  );
};

module.exports = { getUserByEmail, getUserById, createUser, findOrCreateOAuthUser, updateLastActive, updatePassword };
