/**
 * Health Reading Validator
 *
 * Validates request bodies for health reading CRUD.
 * The primary challenge is that required sub-fields depend on `type`.
 *
 * DESIGN DECISION — Conditional validation with express-validator's .if():
 *
 *   The HealthReading model is polymorphic: one collection stores three
 *   different metric types, each requiring different data fields:
 *     type: 'blood_pressure' → requires bloodPressure.systolic + diastolic
 *     type: 'weight'         → requires weight.value (+ optional unit)
 *     type: 'blood_sugar'    → requires bloodSugar.value (+ optional unit, mealContext)
 *
 *   express-validator's `.if(body('type').equals('blood_pressure'))` chain
 *   makes fields conditionally required based on the value of another field.
 *   This gives precise, field-level errors instead of a generic "missing data".
 *
 * DESIGN DECISION — Nested field syntax:
 *   express-validator supports dot notation for nested objects:
 *     body('bloodPressure.systolic')  reads  req.body.bloodPressure.systolic
 *   This aligns with the Mongoose sub-schema structure exactly.
 *
 * DESIGN DECISION — recordedAt is optional, defaults to now:
 *   Users can log a reading they took earlier (e.g., forgot to enter yesterday's
 *   BP). The service defaults recordedAt to Date.now() if not provided.
 *   Validated as ISO8601 if provided.
 */

const { body } = require('express-validator');
const { handleValidationErrors } = require('./auth.validator');

// ─────────────────────────────────────────────────────────────
// LOG READING — POST /api/health/readings
// ─────────────────────────────────────────────────────────────
const logReadingValidation = [
  // ── type (discriminator) ──────────────────────────────────
  body('type')
    .notEmpty().withMessage('Reading type is required.')
    .isIn(['blood_pressure', 'weight', 'blood_sugar'])
    .withMessage('Type must be one of: blood_pressure, weight, blood_sugar.'),

  // ── blood_pressure fields (conditional) ──────────────────
  body('bloodPressure.systolic')
    .if(body('type').equals('blood_pressure'))
    .notEmpty().withMessage('Systolic pressure is required for blood pressure readings.')
    .isFloat({ min: 50, max: 300 })
    .withMessage('Systolic pressure must be between 50 and 300 mmHg.'),

  body('bloodPressure.diastolic')
    .if(body('type').equals('blood_pressure'))
    .notEmpty().withMessage('Diastolic pressure is required for blood pressure readings.')
    .isFloat({ min: 30, max: 200 })
    .withMessage('Diastolic pressure must be between 30 and 200 mmHg.'),

  // ── weight fields (conditional) ───────────────────────────
  body('weight.value')
    .if(body('type').equals('weight'))
    .notEmpty().withMessage('Weight value is required for weight readings.')
    .isFloat({ min: 1, max: 700 })
    .withMessage('Weight must be between 1 and 700.'),

  body('weight.unit')
    .optional()
    .isIn(['kg', 'lbs'])
    .withMessage('Weight unit must be "kg" or "lbs".'),

  // ── blood_sugar fields (conditional) ─────────────────────
  body('bloodSugar.value')
    .if(body('type').equals('blood_sugar'))
    .notEmpty().withMessage('Blood sugar value is required for blood sugar readings.')
    .isFloat({ min: 1, max: 1500 })
    .withMessage('Blood sugar value must be between 1 and 1500.'),

  body('bloodSugar.unit')
    .optional()
    .isIn(['mg/dL', 'mmol/L'])
    .withMessage('Blood sugar unit must be "mg/dL" or "mmol/L".'),

  body('bloodSugar.mealContext')
    .optional()
    .isIn(['fasting', 'post_meal', 'random', 'before_bed'])
    .withMessage('Meal context must be one of: fasting, post_meal, random, before_bed.'),

  // ── Common optional fields ────────────────────────────────
  body('recordedAt')
    .optional()
    .isISO8601().withMessage('Recorded date must be a valid ISO 8601 date.')
    .toDate(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Notes cannot exceed 300 characters.'),

  handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// GET READINGS QUERY PARAMS — GET /api/health/readings
// Validates optional query parameters for filtering
// ─────────────────────────────────────────────────────────────
const { query } = require('express-validator');

const getReadingsValidation = [
  query('type')
    .optional()
    .isIn(['blood_pressure', 'weight', 'blood_sugar'])
    .withMessage('Type filter must be one of: blood_pressure, weight, blood_sugar.'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a number between 1 and 100.'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('startDate must be a valid ISO 8601 date.'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('endDate must be a valid ISO 8601 date.'),

  handleValidationErrors
];

module.exports = { logReadingValidation, getReadingsValidation };
