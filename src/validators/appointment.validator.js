/**
 * Appointment Validator
 *
 * Validates request bodies for appointment CRUD endpoints.
 *
 * DESIGN DECISIONS:
 *
 * 1. appointmentDate — past dates allowed:
 *    We do NOT enforce that appointmentDate must be in the future.
 *    Reason: Users may want to log past appointments for record-keeping
 *    (e.g., "I had a cardiology check-up last month"). Blocking past dates
 *    would prevent this legitimate use case.
 *    IMPROVEMENT: Add a query parameter `?upcoming=true` in the service
 *    to show only future appointments on the dashboard.
 *
 * 2. appointmentTime — validated as HH:MM string:
 *    Stored as a string (not part of a full DateTime) for v1 simplicity.
 *    The Mongoose model also validates this pattern — defense in depth.
 *
 * 3. status in update:
 *    Included so the client can update the full appointment including
 *    changing status. A separate PATCH /:id/status is also provided
 *    in the route for convenience (status-only change).
 *
 * 4. Separate create vs update validators:
 *    Same rationale as reminder.validator.js — optional fields on update
 *    for partial updates without forcing a full body resend.
 */

const { body } = require('express-validator');
const { handleValidationErrors } = require('./auth.validator');

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ─────────────────────────────────────────────────────────────
// CREATE — POST /api/appointments
// ─────────────────────────────────────────────────────────────
const createAppointmentValidation = [
  body('doctorName')
    .trim()
    .notEmpty().withMessage("Doctor's name is required.")
    .isLength({ max: 100 }).withMessage("Doctor's name cannot exceed 100 characters."),

  body('specialty')
    .trim()
    .notEmpty().withMessage('Medical specialty is required (e.g., "Cardiologist", "General Physician").')
    .isLength({ max: 100 }).withMessage('Specialty cannot exceed 100 characters.'),

  body('appointmentDate')
    .notEmpty().withMessage('Appointment date is required.')
    .isISO8601().withMessage('Appointment date must be a valid date (e.g., "2024-06-15").')
    .toDate(),

  body('appointmentTime')
    .notEmpty().withMessage('Appointment time is required.')
    .matches(TIME_REGEX).withMessage('Appointment time must be in HH:MM format (e.g., "09:30", "14:00").'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),

  handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// UPDATE — PUT /api/appointments/:id
// All fields optional (partial update)
// ─────────────────────────────────────────────────────────────
const updateAppointmentValidation = [
  body('doctorName')
    .optional()
    .trim()
    .notEmpty().withMessage("Doctor's name cannot be empty.")
    .isLength({ max: 100 }).withMessage("Doctor's name cannot exceed 100 characters."),

  body('specialty')
    .optional()
    .trim()
    .notEmpty().withMessage('Specialty cannot be empty.')
    .isLength({ max: 100 }).withMessage('Specialty cannot exceed 100 characters.'),

  body('appointmentDate')
    .optional()
    .isISO8601().withMessage('Appointment date must be a valid date.')
    .toDate(),

  body('appointmentTime')
    .optional()
    .matches(TIME_REGEX).withMessage('Appointment time must be in HH:MM format (e.g., "09:30").'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),

  body('status')
    .optional()
    .isIn(['upcoming', 'completed', 'cancelled'])
    .withMessage('Status must be one of: upcoming, completed, cancelled.'),

  handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// UPDATE STATUS — PATCH /api/appointments/:id/status
// Only the status field — for quick status changes from the dashboard
// ─────────────────────────────────────────────────────────────
const updateStatusValidation = [
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(['upcoming', 'completed', 'cancelled'])
    .withMessage('Status must be one of: upcoming, completed, cancelled.'),

  handleValidationErrors
];

module.exports = {
  createAppointmentValidation,
  updateAppointmentValidation,
  updateStatusValidation
};
