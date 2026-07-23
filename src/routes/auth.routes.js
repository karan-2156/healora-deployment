/**
 * Auth Routes
 * Base path: /api/auth  (mounted in app.js)
 *
 * ─────────────────────────────────────────────────────────────
 * ROUTE MAP:
 *
 *   POST   /api/auth/register   → Register a new user account
 *   POST   /api/auth/login      → Authenticate and receive a JWT
 *   GET    /api/auth/me         → Get the current user's profile  [protected]
 *   POST   /api/auth/logout     → Client-side logout signal       [protected]
 *
 * ─────────────────────────────────────────────────────────────
 * REQUEST PIPELINE ORDER (per route):
 *
 *   Public routes (register, login):
 *     Validation middleware → Controller
 *
 *   Protected routes (me, logout):
 *     protect middleware → Controller
 *
 *   The route file is intentionally thin:
 *     - No business logic.
 *     - No DB calls.
 *     - No error handling.
 *   Those concerns belong in the service, controller, and middleware layers.
 *
 * ─────────────────────────────────────────────────────────────
 * DESIGN DECISION — Why are validators spread into the route as arrays?
 *
 *   express-validator returns arrays of middleware (one per field rule, plus
 *   the handleValidationErrors function appended at the end of the array).
 *   Express accepts variadic middleware arguments, so:
 *
 *     router.post('/register', ...registerValidation, AuthController.register)
 *
 *   is equivalent to:
 *
 *     router.post(
 *       '/register',
 *       validateName,
 *       validateEmail,
 *       validatePassword,
 *       handleValidationErrors,
 *       AuthController.register
 *     )
 *
 *   The spread syntax keeps the route declaration readable while preserving
 *   the full middleware chain.
 *
 * ─────────────────────────────────────────────────────────────
 * DESIGN DECISION — /me vs /profile:
 *
 *   Common conventions for "get the current user" endpoint:
 *     - GET /api/auth/me        → Clean, short, clearly scoped to auth
 *     - GET /api/users/profile  → More RESTful (user resource)
 *     - GET /api/users/me       → Hybrid approach
 *
 *   We use /api/auth/me for v1 because:
 *     1. It keeps all authentication-related endpoints under one prefix.
 *     2. It's unambiguous — there's no confusion with fetching other users.
 *     3. It mirrors the convention used by GitHub API, Spotify API, and others.
 *
 *   IMPROVEMENT: In v2, if user management features are added (admin panel,
 *   user list, public profiles), move this to GET /api/users/me and create
 *   a dedicated users.routes.js.
 */

const express           = require('express');
const AuthController    = require('../controllers/auth.controller');
const { protect }       = require('../middleware/auth.middleware');
const {
  registerValidation,
  loginValidation
}                        = require('../validators/auth.validator');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// No authentication required.
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 *
 * Creates a new user account.
 *
 * Body:
 *   { name: string, email: string, password: string }
 *
 * Success (201):
 *   { success: true, message: '...', data: { token, user } }
 *
 * Errors:
 *   422 — Validation failed (missing/malformed fields)
 *   409 — Email already registered
 */
router.post('/register', ...registerValidation, AuthController.register);

/**
 * POST /api/auth/login
 *
 * Authenticates a user and returns a JWT.
 *
 * Body:
 *   { email: string, password: string }
 *
 * Success (200):
 *   { success: true, message: '...', data: { token, user } }
 *
 * Errors:
 *   422 — Validation failed
 *   401 — Invalid email or password
 *   403 — Account deactivated
 */
router.post('/login', ...loginValidation, AuthController.login);

router.post("/google", AuthController.googleLogin);
/**
 * POST /api/auth/forgot-password
 *
 * Sends a 6-digit OTP to the user's registered email.
 *
 * Body:
 *   { email: string }
 *
 * Success (200):
 *   { success: true, message: 'OTP sent successfully.' }
 */
router.post('/forgot-password', AuthController.forgotPassword);


/**
 * POST /api/auth/verify-otp
 *
 * Verifies the OTP sent to the user's email.
 */
router.post('/verify-otp', AuthController.verifyOtp);
/**
 * POST /api/auth/reset-password
 *
 * Resets the user's password after OTP verification.
 */
router.post('/reset-password', AuthController.resetPassword);
// ─────────────────────────────────────────────────────────────
// PROTECTED ROUTES
// Require a valid JWT in the Authorization: Bearer <token> header.
// The `protect` middleware handles token extraction, verification,
// and DB lookup — controllers receive a populated req.user object.
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile.
 * No body required — identity comes from the JWT.
 *
 * Success (200):
 *   { success: true, message: '...', data: { user } }
 *
 * Errors:
 *   401 — No token / expired token / invalid token
 *   404 — User no longer exists in DB
 */
router.get('/me', protect, AuthController.getMe);
router.put('/me', protect, AuthController.updateMe);
router.post('/logout', protect, AuthController.logout);

/**
 * POST /api/auth/logout
 *
 * Signals a logout event server-side.
 * The actual token deletion must be performed by the client.
 * See auth.controller.js for a detailed explanation of stateless JWT logout.
 *
 * Success (200):
 *   { success: true, message: '...', data: null }
 */
router.post('/logout', protect, AuthController.logout);

module.exports = router;
