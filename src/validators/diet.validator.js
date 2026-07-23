/**
 * Diet Recommendation Validator
 *
 * Validates the request body for POST /api/diet/recommend.
 *
 * DESIGN DECISION — Required vs Optional fields:
 *
 *   Only `fitnessGoal` is required. Everything else is optional and
 *   degrades gracefully to defaults in the prompt builder (prompts.utils.js).
 *   Reasoning: We don't want to block a user from getting diet advice
 *   just because they haven't filled in their blood group or allergies.
 *   The more data provided, the more personalized the recommendation.
 *
 * DESIGN DECISION — `healthConditions` as free text vs enum:
 *   Health conditions are too diverse to enumerate (diabetes, hypertension,
 *   thyroid disorder, PCOS, etc.). Free text is more inclusive.
 *   The AI is instructed to handle whatever is provided.
 *   Max 300 chars prevents excessively long condition lists.
 *
 * DESIGN DECISION — `allergies` as array:
 *   Stored as an array on the frontend and validated as an array here.
 *   Each allergy is a short string (e.g., "peanuts", "dairy", "shellfish").
 */

const { body } = require('express-validator');
const { handleValidationErrors } = require('./auth.validator');

const dietRecommendValidation = [
  // ── Required ────────────────────────────────────────────────
  body('fitnessGoal')
    .notEmpty().withMessage('Fitness goal is required.')
    .isIn(['weight_loss', 'weight_gain', 'muscle_building', 'maintain_weight', 'improve_energy', 'manage_condition'])
    .withMessage(
      'Fitness goal must be one of: weight_loss, weight_gain, muscle_building, ' +
      'maintain_weight, improve_energy, manage_condition.'
    ),

  // ── Optional ────────────────────────────────────────────────
  body('dietaryPreference')
    .optional()
    .isIn(['no_restriction', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'mediterranean', 'gluten_free', 'dairy_free'])
    .withMessage(
      'Dietary preference must be one of: no_restriction, vegetarian, vegan, ' +
      'pescatarian, keto, paleo, mediterranean, gluten_free, dairy_free.'
    ),

  body('healthConditions')
    .optional()
    .isString().withMessage('Health conditions must be a text string.')
    .trim()
    .isLength({ max: 300 }).withMessage('Health conditions description cannot exceed 300 characters.'),

  body('allergies')
    .optional()
    .isArray({ max: 20 }).withMessage('Allergies must be an array with at most 20 items.')
    .custom((arr) => {
      // Ensure each allergy entry is a non-empty string under 50 chars
      const valid = arr.every(
        (item) => typeof item === 'string' && item.trim().length > 0 && item.trim().length <= 50
      );
      if (!valid) {
        throw new Error('Each allergy must be a non-empty string under 50 characters.');
      }
      return true;
    }),

  body('mealsPerDay')
    .optional()
    .isInt({ min: 1, max: 6 }).withMessage('Meals per day must be a number between 1 and 6.'),

  body('additionalNotes')
    .optional()
    .isString().withMessage('Additional notes must be a text string.')
    .trim()
    .isLength({ max: 300 }).withMessage('Additional notes cannot exceed 300 characters.'),

  handleValidationErrors
];

module.exports = { dietRecommendValidation };
