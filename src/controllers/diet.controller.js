/**
 * Diet Controller
 *
 * HTTP layer for AI-powered diet recommendations.
 * All business logic lives in diet.service.js.
 *
 * ENDPOINTS HANDLED:
 *   POST /api/diet/recommend   — Generate a personalized diet recommendation
 *   GET  /api/diet/history     — List past diet recommendations for the user
 *
 * DESIGN DECISION — User profile from req.user (not re-fetched):
 *   The protect middleware fetches the user from MongoDB on every protected
 *   request and attaches it as req.user. The diet service uses req.user.age,
 *   req.user.gender, and req.user.bloodGroup directly for prompt personalization.
 *
 *   We pass the entire req.user object to the service rather than extracting
 *   individual fields in the controller, because:
 *     1. The service knows exactly which profile fields it needs.
 *     2. If we add new profile fields later, the controller doesn't change.
 *     3. Keeps the controller truly thin — no data transformation here.
 */

const DietService     = require('../services/diet.service');
const { sendSuccess } = require('../utils/response.utils');
const asyncWrapper    = require('../utils/asyncWrapper');

// ─────────────────────────────────────────────────────────────
// POST /api/diet/recommend
// ─────────────────────────────────────────────────────────────
/**
 * Generates a personalized diet recommendation based on the user's
 * health profile and submitted preferences.
 *
 * Request body (validated by dietRecommendValidation):
 *   {
 *     fitnessGoal:       string   (required) — e.g. "weight_loss"
 *     dietaryPreference: string   (optional) — e.g. "vegetarian"
 *     healthConditions:  string   (optional) — e.g. "type 2 diabetes"
 *     allergies:         string[] (optional) — e.g. ["peanuts", "dairy"]
 *     mealsPerDay:       number   (optional) — 1–6, default 3
 *     additionalNotes:   string   (optional) — any extra context
 *   }
 *
 * Response (200):
 *   {
 *     success: true,
 *     data: {
 *       recommendation: string   — full Gemini-generated diet plan (Markdown)
 *       sessionId:      string   — ID under which this recommendation is stored
 *     }
 *   }
 */
exports.getDietRecommendation = asyncWrapper(async (req, res) => {
  const {
    fitnessGoal,
    dietaryPreference,
    healthConditions,
    allergies,
    mealsPerDay,
    additionalNotes
  } = req.body;

  // Bundle only the validated preference fields into a clean object
  const preferences = {
    fitnessGoal,
    ...(dietaryPreference  && { dietaryPreference }),
    ...(healthConditions   && { healthConditions }),
    ...(allergies          && { allergies }),
    ...(mealsPerDay        && { mealsPerDay: parseInt(mealsPerDay, 10) }),
    ...(additionalNotes    && { additionalNotes })
  };

  // Pass the full user document for profile context (age, gender, bloodGroup)
  const result = await DietService.getDietRecommendation(req.user, preferences);

  return sendSuccess(
    res,
    result,
    'Diet recommendation generated successfully.'
  );
});

// ─────────────────────────────────────────────────────────────
// GET /api/diet/history
// ─────────────────────────────────────────────────────────────
/**
 * Returns a list of the user's past diet recommendations (metadata only).
 * The full recommendation text is stored in ChatHistory and can be fetched
 * by sessionId from the chat history endpoint.
 *
 * Response (200):
 *   {
 *     success: true,
 *     data: {
 *       history: [{ sessionId, title, createdAt }],
 *       count:   number
 *     }
 *   }
 */
exports.getDietHistory = asyncWrapper(async (req, res) => {
  const history = await DietService.getDietHistory(req.user._id);

  return sendSuccess(
    res,
    { history, count: history.length },
    'Diet recommendation history retrieved successfully.'
  );
});
