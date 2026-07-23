/**
 * Auth Controller
 *
 * Handles HTTP concerns ONLY:
 *   - Reading req.body / req.user
 *   - Calling the appropriate service method
 *   - Shaping and sending the HTTP response
 *
 * There is NO business logic here. No bcrypt, no JWT, no DB calls.
 * All of that lives in auth.service.js.
 *
 * DESIGN DECISION — Token in response body vs Set-Cookie header:
 *   For v1, the JWT is returned in the response body under `data.token`.
 *   The frontend stores it (in memory or localStorage) and sends it
 *   in the Authorization header on subsequent requests.
 *
 *   WHY: Simplest approach for a REST API with a JavaScript frontend.
 *        Easy to test in Postman without cookie configuration.
 *
 *   IMPROVEMENT: For production hardening, move to HttpOnly cookies:
 *     res.cookie('token', token, {
 *       httpOnly: true,
 *       secure: process.env.NODE_ENV === 'production',
 *       sameSite: 'strict',
 *       maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
 *     });
 */

const AuthService    = require('../services/auth.service');
const { signToken }  = require('../utils/jwt.utils');
const { sendSuccess } = require('../utils/response.utils');
const asyncWrapper   = require('../utils/asyncWrapper');

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
/**
 * Registers a new user and returns a JWT.
 *
 * Flow:
 *   1. Validator middleware runs first (declared in the route).
 *   2. Controller calls AuthService.registerUser().
 *   3. On success, signs a token and returns user + token.
 *   4. On failure, asyncWrapper forwards AppError to global error handler.
 */
exports.register = asyncWrapper(async (req, res) => {
  const { name, email, password } = req.body;

  // Create the user (service handles duplicate check + hashing)
  const user = await AuthService.registerUser({ name, email, password });

  // Sign a JWT for the newly created user
  const token = signToken(user._id);

  // 201 Created — a new resource was created
  return sendSuccess(
    res,
    { token, user },
    'Account created successfully. Welcome!',
    201
  );
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
/**
 * Authenticates credentials and returns a JWT.
 *
 * Flow:
 *   1. Validator middleware runs first.
 *   2. Controller calls AuthService.loginUser().
 *   3. On success, returns user + token.
 *   4. On invalid credentials, service throws AppError(401) → error handler.
 */
exports.login = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;

  // Authenticate the user (service handles bcrypt comparison + account status)
  const user = await AuthService.loginUser({ email, password });

  // Sign a fresh JWT on each successful login
  const token = signToken(user._id);

  return sendSuccess(
    res,
    { token, user },
    'Login successful. Welcome back!'
  );
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────
/**
 * Returns the currently authenticated user's profile.
 *
 * The `protect` middleware runs before this controller and attaches the
 * full user document to req.user. No DB call is needed here.
 *
 * This endpoint is useful for the frontend to:
 *   - Hydrate the user state after a page refresh.
 *   - Verify a stored token is still valid.
 *   - Display user profile information.
 */
exports.getMe = asyncWrapper(async (req, res) => {
  // req.user is already populated by the protect middleware
  return sendSuccess(
    res,
    { user: req.user },
    'User profile retrieved successfully.'
  );
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────
/**
 * Logout endpoint.
 *
 * ─────────────────────────────────────────────────────────────
 * DESIGN DECISION — Stateless JWT Logout:
 *
 * JWTs are stateless by design. The server issues a token and then has
 * no record of it. True server-side invalidation requires one of:
 *
 *   Option A (chosen) — Client-side logout:
 *     The server returns 200. The client deletes the token from storage.
 *     The token technically remains valid until expiry, but the client
 *     no longer has it.
 *     Pros: Zero server infrastructure, zero DB calls, perfectly scalable.
 *     Cons: If a token is stolen and the user logs out, the stolen token
 *           remains valid until it expires (mitigated by short expiry times).
 *
 *   Option B — Token blacklist (Redis):
 *     Store invalidated JTI (JWT ID) in Redis with a TTL matching token expiry.
 *     The protect middleware checks the blacklist on every request.
 *     Pros: True immediate invalidation.
 *     Cons: Requires Redis infrastructure, adds latency to every protected request.
 *
 *   Option C — Refresh token rotation:
 *     Short-lived access tokens (15min) + long-lived refresh tokens stored in DB.
 *     Revoking the refresh token effectively logs the user out.
 *     Pros: Industry gold standard. Best security posture.
 *     Cons: Significantly more complex to implement and maintain.
 *
 * CHOSEN: Option A for v1. The 7-day JWT_EXPIRES_IN means the window of
 * exposure on a stolen token after logout is at most 7 days (in practice much
 * less since users re-login frequently).
 *
 * IMPROVEMENT: Implement Option C (refresh token rotation) for production.
 * ─────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/me
// ─────────────────────────────────────────────────────────────
exports.updateMe = asyncWrapper(async (req, res) => {

  const user = await AuthService.updateMe(req.user._id, req.body);

  return sendSuccess(
    res,
    { user },
    'Profile updated successfully.'
  );

});
exports.logout = asyncWrapper(async (req, res) => {
  // The actual logout work happens on the client (delete the token from storage).
  // This endpoint exists so the frontend has a consistent API call to make,
  // and so future middleware (audit logging, session tracking) has a hook point.

  return sendSuccess(
    res,
    null,
    'Logged out successfully. Please delete your token on the client.'
  );
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────
exports.forgotPassword = asyncWrapper(async (req, res) => {

  const { email } = req.body;

  await AuthService.forgotPassword(email);

  return sendSuccess(
    res,
    null,
    "OTP sent successfully. Please check your email."
  );

});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────────────────────
exports.verifyOtp = asyncWrapper(async (req, res) => {

  const { email, otp } = req.body;

  await AuthService.verifyOtp({ email, otp });

  return sendSuccess(
    res,
    null,
    "OTP verified successfully."
  );

});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────
exports.resetPassword = asyncWrapper(async (req, res) => {

  const { email, otp, newPassword } = req.body;

  await AuthService.resetPassword({

    email,
    otp,
    newPassword

  });

  return sendSuccess(

    res,
    null,
    "Password reset successfully. You can now log in."

  );

});


exports.googleLogin = asyncWrapper(async (req, res) => {

    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({
            success: false,
            message: "Google ID token is required."
        });
    }

    const user = await AuthService.googleLogin(idToken);

    const token = signToken(user._id);

    return sendSuccess(
        res,
        {
            token,
            user
        },
        "Google login successful."
    );

});
