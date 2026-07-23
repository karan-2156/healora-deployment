/**
 * Auth Validators
 *
 * Defines request body validation rules using express-validator.
 * Each export is an array of middleware that can be spread directly into a route.
 *
 * DESIGN DECISION — Validation layer vs. Mongoose validation:
 *
 * Both layers validate data, but they serve different purposes:
 *
 *   express-validator (this file):
 *   - Runs BEFORE the controller and BEFORE any DB call.
 *   - Returns structured 422 errors immediately if input is malformed.
 *   - Prevents wasted DB round-trips for obviously bad requests.
 *   - Produces user-friendly field-level error messages for the frontend.
 *
 *   Mongoose schema validation (Phase 2 models):
 *   - Runs AT THE DB LAYER as a last line of defense.
 *   - Catches edge cases that bypass the request validator
 *     (e.g., direct service calls in tests, future internal API calls).
 *
 * Both layers should exist. They are complementary, not redundant.
 *
 * DESIGN DECISION — handleValidationErrors placement:
 *   This middleware is added as the LAST item in each validation array.
 *   This means routes read as:
 *     router.post('/register', registerValidation, controller.register)
 *   where `registerValidation` already includes the error-check middleware.
 *   Keeps routes clean — no need to manually add the error handler per route.
 */

const { body, validationResult } = require('express-validator');
const { sendError } = require('../utils/response.utils');

// ─────────────────────────────────────────────
// Shared: Handle Validation Errors
// ─────────────────────────────────────────────
/**
 * Reads the result of all preceding body() validators.
 * If any validation failed, returns a 422 with a field-level error array.
 * If all pass, calls next() to proceed to the controller.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors as an array of { field, message } objects
    // This structure is easy for the frontend to map to form field error states
    const formatted = errors.array().map((err) => ({
      field:   err.path,    // The field name (e.g., 'email', 'password')
      message: err.msg      // The human-readable error message
    }));

    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please check your input.',
      errors: formatted,
      data: null
    });
  }

  next();
};

// ─────────────────────────────────────────────
// Register Validation
// POST /api/auth/register
// ─────────────────────────────────────────────
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(), // Lowercases and removes dots in Gmail addresses

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    // IMPROVEMENT: Add special character requirement for higher-security deployments:
    // .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character')

  // Run the error collector last
  handleValidationErrors
];

// ─────────────────────────────────────────────
// Login Validation
// POST /api/auth/login
// ─────────────────────────────────────────────
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
  // NOTE: We intentionally do NOT validate password complexity on login.
  // Telling an attacker "password must contain uppercase" reveals our policy.
  // We just check it's not empty, then let bcrypt compare handle the rest.

  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  handleValidationErrors // Exported for use in other validator files (Phases 5–6)
};
