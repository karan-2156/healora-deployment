/**
 * Diet Recommendation Routes
 * Base path: /api/diet  (mounted in app.js)
 *
 * ─────────────────────────────────────────────────────────────
 * ROUTE MAP:
 *
 *   POST  /api/diet/recommend   → Generate a personalized diet recommendation
 *   GET   /api/diet/history     → List past diet recommendations
 *
 * ─────────────────────────────────────────────────────────────
 * MIDDLEWARE CHAIN:
 *
 *   protect           — JWT verification
 *   aiStandardLimiter — 20 requests / 15 min (same tier as symptom checker)
 *   validator         — Validates preferences body
 *   controller        — Delegates to DietService
 *
 * DESIGN DECISION — Separate POST /recommend vs. GET /recommend:
 *   POST is used even though this could be argued as a "read" operation
 *   (fetching a recommendation, not creating a persistent resource).
 *   We use POST because:
 *     1. The request body contains preferences — GET requests shouldn't
 *        have bodies (RFC 7231 discourages it, and some proxies strip them).
 *     2. The operation IS side-effectful: we save the recommendation to
 *        ChatHistory, making POST semantically correct.
 *
 * DESIGN DECISION — History endpoint returns metadata only:
 *   GET /history returns { sessionId, title, createdAt } per recommendation.
 *   The full recommendation text is stored in ChatHistory under the diet_advisor
 *   feature and can be accessed via the sessionId if needed.
 *   This keeps the history list payload small for the dashboard.
 */

const express           = require('express');
const DietController    = require('../controllers/diet.controller');
const { protect }       = require('../middleware/auth.middleware');
const { aiStandardLimiter } = require('../middleware/rateLimiter.middleware');
const { dietRecommendValidation } = require('../validators/diet.validator');

const router = express.Router();

// All diet routes require authentication
router.use(protect);

/**
 * POST /api/diet/recommend
 *
 * Body:
 *   {
 *     fitnessGoal:       string   (required)
 *     dietaryPreference: string   (optional)
 *     healthConditions:  string   (optional)
 *     allergies:         string[] (optional)
 *     mealsPerDay:       number   (optional, 1–6)
 *     additionalNotes:   string   (optional)
 *   }
 *
 * Success (200):
 *   { data: { recommendation: string, sessionId: string } }
 *
 * Errors:
 *   401 — Not authenticated
 *   422 — Validation failed
 *   429 — Rate limit exceeded
 *   503 — Gemini service unavailable
 */
router.post(
  '/recommend',
  aiStandardLimiter,
  ...dietRecommendValidation,
  DietController.getDietRecommendation
);

/**
 * GET /api/diet/history
 *
 * No body required.
 *
 * Success (200):
 *   { data: { history: [{ sessionId, title, createdAt }], count: number } }
 */
router.get('/history', DietController.getDietHistory);

module.exports = router;
