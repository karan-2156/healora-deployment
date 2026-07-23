/**
 * Authentication Middleware
 *
 * The `protect` middleware guards every private route.
 * It runs BEFORE any protected controller and must:
 *   1. Extract the token from the Authorization header.
 *   2. Verify the token's signature and expiry.
 *   3. Confirm the token's user still exists and is active in the DB.
 *   4. Attach the user document to req.user for downstream controllers.
 *
 * DESIGN DECISION — Authorization Header vs Cookie:
 *
 *   Option A (chosen) — Bearer token in Authorization header:
 *     `Authorization: Bearer <token>`
 *     - Standard for REST APIs consumed by JavaScript frontends.
 *     - Frontend stores token in memory or localStorage and sends it manually.
 *     - Simple to implement and test with tools like Postman.
 *     - Vulnerable to XSS if stored in localStorage.
 *
 *   Option B — HttpOnly Cookie:
 *     - Token sent automatically by the browser on every request.
 *     - Immune to XSS (JavaScript cannot read HttpOnly cookies).
 *     - Vulnerable to CSRF (mitigated with SameSite=Strict or CSRF tokens).
 *     - More complex — requires CORS `credentials: true` configuration.
 *
 *   CHOSEN: Option A for v1 simplicity and Postman testability during development.
 *   IMPROVEMENT: Migrate to HttpOnly cookies in production for better XSS protection.
 *
 * DESIGN DECISION — DB lookup on every protected request:
 *
 *   After verifying the JWT signature, we still query MongoDB to confirm the
 *   user exists and is active. Why not just trust the JWT?
 *
 *   Problem: A JWT is valid until expiry even if the user:
 *     - Deletes their account (isActive = false)
 *     - Is banned by an admin
 *     - Has their token compromised and an admin resets their account
 *
 *   The DB lookup adds ~1-2ms per request but catches all these cases.
 *   The user document is also attached to req.user, so controllers don't
 *   need a second DB call to get user data.
 *
 *   IMPROVEMENT: For high-traffic scenarios, cache the user document in Redis
 *   with a short TTL (60s) to eliminate the per-request DB lookup.
 */

const { verifyToken }  = require('../utils/jwt.utils');
const { getUserById }  = require('../services/auth.service');
const AppError         = require('../utils/AppError');
const asyncWrapper     = require('../utils/asyncWrapper');

/**
 * protect — attaches req.user or rejects with 401.
 * Apply to any route that requires authentication:
 *   router.get('/me', protect, controller.getMe)
 */
const protect = asyncWrapper(async (req, res, next) => {
  // ── Step 1: Extract Token ──────────────────────────────────
  // Standard format: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1]; // Get the part after "Bearer "
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to access this resource.', 401)
    );
  }

  // ── Step 2: Verify Token ───────────────────────────────────
  // verifyToken() throws two JWT-specific errors that we handle explicitly:
  //   - JsonWebTokenError: signature is invalid (tampered token)
  //   - TokenExpiredError: token has passed its `exp` timestamp
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    // Distinguish between expired and invalid for better UX messaging
    if (err.name === 'TokenExpiredError') {
      return next(
        new AppError('Your session has expired. Please log in again.', 401)
      );
    }
    // Any other JWT error (invalid signature, malformed token, etc.)
    return next(
      new AppError('Invalid token. Please log in again.', 401)
    );
  }

  // ── Step 3: Verify User Still Exists ──────────────────────
  // The token was valid, but the user may have been deleted or deactivated
  // after the token was issued. This step catches that.
  const currentUser = await getUserById(decoded.id);

  // ── Step 4: Attach User to Request ────────────────────────
  // All subsequent middleware and controllers in this request chain
  // can access the authenticated user via req.user without a DB call.
  req.user = currentUser;

  next();
});

module.exports = { protect };
