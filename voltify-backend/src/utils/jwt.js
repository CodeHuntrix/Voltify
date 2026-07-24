const jwt = require('jsonwebtoken');

/**
 * Signs a JWT token with userId payload
 * @param {string} userId - UUID of the user
 * @returns {string} signed JWT token
 */
const signToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Verifies and decodes a JWT token
 * @param {string} token
 * @returns {object} decoded payload { userId, iat, exp }
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { signToken, verifyToken };
