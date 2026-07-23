/**
 * Symptom Checker Validator
 *
 * Validates the request body for POST /api/symptoms/analyze.
 *
 * FIELDS:
 *   message   (required) — The user's symptom description or follow-up chat message.
 *   sessionId (optional) — UUID linking this message to an existing conversation.
 *                          If omitted, the service creates a new session.
 *
 * DESIGN DECISION — Why validate message length?
 *   - Min 3 chars: Prevents empty or trivially short inputs like "hi" or "?"
 *     that give Gemini nothing useful to work with.
 *   - Max 1000 chars: Prevents prompt injection attacks where a user embeds
 *     a huge instruction block trying to override the system prompt. Also
 *     keeps Gemini token usage predictable.
 *
 * DESIGN DECISION — sessionId validation:
 *   We validate it's a string (if provided) but do NOT enforce UUID format
 *   strictly. The service will look it up in MongoDB — if it doesn't exist,
 *   a new session is created. This is more forgiving for v1.
 *   IMPROVEMENT: Enforce UUID v4 format with .isUUID(4) for stricter validation.
 */

const { body } = require('express-validator');
const { handleValidationErrors } = require('./auth.validator');

const analyzeSymptomValidation = [
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required. Please describe your symptoms.')
    .isLength({ min: 3 }).withMessage('Message must be at least 3 characters long.')
    .isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters.')
    .isString().withMessage('Message must be a text string.'),

  body('sessionId')
    .optional()
    .isString().withMessage('Session ID must be a string.')
    .trim()
    .isLength({ max: 100 }).withMessage('Session ID is too long.'),

  handleValidationErrors
];

module.exports = { analyzeSymptomValidation };
