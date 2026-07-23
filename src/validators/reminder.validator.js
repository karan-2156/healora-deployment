/**
 * Medicine Reminder Validator
 *
 * Validates request bodies for medicine reminder CRUD endpoints.
 *
 * DESIGN DECISIONS:
 *
 * 1. TIMES ARRAY VALIDATION:
 *    The `times` field is an array of "HH:MM" strings (e.g., ["08:00", "20:00"]).
 *    We validate:
 *      a) It is an array with at least 1 and at most 6 entries.
 *      b) Each entry matches the /^([01]\d|2[0-3]):([0-5]\d)$/ regex — same
 *         regex used in the Mongoose model for consistency (defense in depth).
 *    Max 6 entries: no medication frequency exceeds 6 times per day in practice.
 *
 * 2. endDate VALIDATION:
 *    We validate it is a valid ISO date string if provided.
 *    The cross-field check (endDate > startDate) is enforced by the Mongoose
 *    pre-save hook in MedicineReminder.js. Both layers protect this invariant.
 *
 * 3. SEPARATE create vs update VALIDATION:
 *    `createReminderValidation` — all required fields must be present.
 *    `updateReminderValidation` — all fields are optional (partial update / PATCH-style PUT).
 *    This avoids forcing the client to re-send the full body on every update.
 *
 * 4. isActive in update:
 *    Included so the user can pause/resume a reminder via PUT without needing
 *    a separate PATCH endpoint.
 */

const { body } = require('express-validator');
const { handleValidationErrors } = require('./auth.validator');

// Reusable: validates the times array format
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timesValidation = (required = true) => {
  const chain = body('times');
  const base  = required
    ? chain.notEmpty().withMessage('At least one reminder time is required.')
    : chain.optional();

  return base
    .isArray({ min: 1, max: 6 })
    .withMessage('Times must be an array with 1 to 6 entries.')
    .custom((arr) => {
      if (!Array.isArray(arr)) return true; // Let isArray handle this
      const invalid = arr.filter((t) => !TIME_REGEX.test(t));
      if (invalid.length > 0) {
        throw new Error(
          `Invalid time format(s): ${invalid.join(', ')}. Use HH:MM (e.g., "08:00", "20:30").`
        );
      }
      return true;
    });
};

// ─────────────────────────────────────────────────────────────
// CREATE — POST /api/reminders
// ─────────────────────────────────────────────────────────────
const createReminderValidation = [
  body('medicineName')
    .trim()
    .notEmpty().withMessage('Medicine name is required.')
    .isLength({ max: 100 }).withMessage('Medicine name cannot exceed 100 characters.'),

  body('dosage')
    .trim()
    .notEmpty().withMessage('Dosage is required (e.g., "500mg", "1 tablet").')
    .isLength({ max: 50 }).withMessage('Dosage cannot exceed 50 characters.'),

  body('frequency')
    .notEmpty().withMessage('Frequency is required.')
    .isIn(['once_daily', 'twice_daily', 'three_times_daily', 'weekly', 'as_needed'])
    .withMessage(
      'Frequency must be one of: once_daily, twice_daily, three_times_daily, weekly, as_needed.'
    ),

  timesValidation(true),

  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date (e.g., "2024-01-15").')
    .toDate(),

  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date (e.g., "2024-03-15").')
    .toDate(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Notes cannot exceed 300 characters.'),

  handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// UPDATE — PUT /api/reminders/:id
// All fields optional for partial updates
// ─────────────────────────────────────────────────────────────
const updateReminderValidation = [
  body('medicineName')
    .optional()
    .trim()
    .notEmpty().withMessage('Medicine name cannot be empty.')
    .isLength({ max: 100 }).withMessage('Medicine name cannot exceed 100 characters.'),

  body('dosage')
    .optional()
    .trim()
    .notEmpty().withMessage('Dosage cannot be empty.')
    .isLength({ max: 50 }).withMessage('Dosage cannot exceed 50 characters.'),

  body('frequency')
    .optional()
    .isIn(['once_daily', 'twice_daily', 'three_times_daily', 'weekly', 'as_needed'])
    .withMessage(
      'Frequency must be one of: once_daily, twice_daily, three_times_daily, weekly, as_needed.'
    ),

  timesValidation(false),

  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date.')
    .toDate(),

  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date.')
    .toDate(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Notes cannot exceed 300 characters.'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be true or false.'),

  handleValidationErrors
];

module.exports = { createReminderValidation, updateReminderValidation };
