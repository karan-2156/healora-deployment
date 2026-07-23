/**
 * Emergency Contact Validator
 *
 * Validates request bodies for emergency contact CRUD.
 *
 * DESIGN DECISIONS:
 *
 * 1. PHONE VALIDATION — permissive pattern:
 *    Phone numbers vary enormously across countries:
 *      +1 (555) 123-4567  (US with country code)
 *      +44 20 7946 0958   (UK)
 *      +91-98765-43210    (India)
 *      07700 900123       (UK without country code)
 *    Our regex /^[+]?[\d\s\-().]{7,20}$/ allows:
 *      - Optional leading +
 *      - Digits, spaces, hyphens, parentheses, dots
 *      - 7–20 characters total
 *    This catches clearly invalid inputs (letters, < 7 digits) while
 *    accepting all realistic international formats.
 *    IMPROVEMENT: Use libphonenumber-js for strict international validation.
 *
 * 2. EMAIL is optional:
 *    Not all emergency contacts have email. Making it required would
 *    exclude valid contacts (elderly relatives, etc.).
 *
 * 3. isPrimary in create/update:
 *    The client can set this at create time or toggle it later.
 *    The service handles the "set others to false" logic — the validator
 *    only checks it's a boolean.
 *
 * 4. Separate create vs update validators:
 *    Same pattern as all other Phase 5 validators.
 */

const { body } = require('express-validator');
const { handleValidationErrors } = require('./auth.validator');

const PHONE_REGEX = /^[+]?[\d\s\-().]{7,20}$/;

// ─────────────────────────────────────────────────────────────
// CREATE — POST /api/emergency
// ─────────────────────────────────────────────────────────────
const createContactValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Contact name is required.')
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters.'),

  body('relationship')
    .trim()
    .notEmpty().withMessage('Relationship is required (e.g., "Mother", "Spouse", "Friend").')
    .isLength({ max: 50 }).withMessage('Relationship cannot exceed 50 characters.'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(PHONE_REGEX)
    .withMessage('Please provide a valid phone number (7–20 digits, may include +, spaces, hyphens).'),

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('isPrimary')
    .optional()
    .isBoolean().withMessage('isPrimary must be true or false.'),

  handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// UPDATE — PUT /api/emergency/:id
// All fields optional for partial updates
// ─────────────────────────────────────────────────────────────
const updateContactValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty.')
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters.'),

  body('relationship')
    .optional()
    .trim()
    .notEmpty().withMessage('Relationship cannot be empty.')
    .isLength({ max: 50 }).withMessage('Relationship cannot exceed 50 characters.'),

  body('phone')
    .optional()
    .trim()
    .matches(PHONE_REGEX)
    .withMessage('Please provide a valid phone number.'),

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('isPrimary')
    .optional()
    .isBoolean().withMessage('isPrimary must be true or false.'),

  handleValidationErrors
];

module.exports = { createContactValidation, updateContactValidation };
