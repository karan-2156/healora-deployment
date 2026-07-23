/**
 * JWT Utilities
 *
 * Centralizes all JWT operations in one place so:
 *   - The secret is read from process.env exactly once.
 *   - If we ever change the JWT library or algorithm, only this file changes.
 *   - Controllers and middleware import clean named functions, not raw JWT calls.
 *
 * ALGORITHM CHOICE — HS256 (HMAC-SHA256):
 *   - Symmetric: the same secret is used to sign and verify.
 *   - Simple to configure — one secret in .env.
 *   - Industry standard for monolithic API + frontend architectures.
 *
 *   ALTERNATIVE — RS256 (RSA):
 *   - Asymmetric: private key to sign, public key to verify.
 *   - Better when multiple services need to verify tokens without access
 *     to the signing secret (e.g., microservices).
 *   - Overkill for this project's single-service architecture.
 *   - IMPROVEMENT: Migrate to RS256 if the project evolves into microservices.
 *
 * TOKEN PAYLOAD:
 *   We store only `{ id: user._id }` in the payload — the minimum needed
 *   to identify the user. We deliberately avoid storing:
 *   - Email → changes over time, causes stale tokens
 *   - Role  → changes over time, causes privilege escalation issues
 *   - Name  → unnecessary data in every request
 *
 *   The auth middleware re-fetches the user from MongoDB on every protected
 *   request to get fresh data. This is the correct approach.
 */

const jwt = require('jsonwebtoken');

/**
 * Signs and returns a JWT for the given user ID.
 * @param  {string|ObjectId} userId - MongoDB _id of the authenticated user
 * @returns {string}                 - Signed JWT string
 */
const signToken = (userId) => {
  return jwt.sign(
    { id: userId },                  // Minimal payload — just the user ID
    process.env.JWT_SECRET,          // Secret from .env (validated on startup by env.js)
    { expiresIn: process.env.JWT_EXPIRES_IN } // e.g. '7d', '24h', '60m'
  );
};

/**
 * Verifies a JWT and returns its decoded payload.
 * Throws a JsonWebTokenError if the token is invalid.
 * Throws a TokenExpiredError if the token has expired.
 * Both error types are handled explicitly in auth.middleware.js.
 *
 * @param  {string} token - The raw JWT string from the Authorization header
 * @returns {object}       - Decoded payload { id, iat, exp }
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { signToken, verifyToken };
