/**
 * Symptom Checker Routes
 * Base path: /api/symptoms  (mounted in app.js)
 *
 * ─────────────────────────────────────────────────────────────
 * ROUTE MAP:
 *
 *   POST  /api/symptoms/analyze              → Send symptom message, get AI response
 *   GET   /api/symptoms/sessions             → List all past sessions (metadata)
 *   GET   /api/symptoms/sessions/:sessionId  → Get full message history for one session
 *
 * ─────────────────────────────────────────────────────────────
 * MIDDLEWARE CHAIN per route:
 *
 *   protect           — Verifies JWT, attaches req.user
 *   aiStandardLimiter — Limits to 20 AI requests / 15 min per IP
 *   validator         — Validates req.body (analyze only)
 *   controller        — Business logic delegation
 *
 * DESIGN DECISION — Rate limiter AFTER protect:
 *   Placing the rate limiter after `protect` means unauthenticated requests
 *   are rejected at the JWT check before even consuming a rate limit slot.
 *   This prevents anonymous callers from burning through the limit.
 *
 *   IMPROVEMENT: Swap the key generator from IP to req.user._id (once protect
 *   has run) so limits apply per-user rather than per-IP. This prevents a
 *   shared IP (e.g., office network) from affecting all colleagues.
 *
 * DESIGN DECISION — /sessions/:sessionId vs /sessions/:id:
 *   We use `:sessionId` (a UUID string) rather than `:id` (a MongoDB ObjectId)
 *   because the session lookup in the service uses `sessionId` as the query
 *   field, not `_id`. This mirrors the field name and avoids confusion.
 */

const express             = require('express');
const SymptomController   = require('../controllers/symptom.controller');
const { protect }         = require('../middleware/auth.middleware');
const { aiStandardLimiter } = require('../middleware/rateLimiter.middleware');
const { analyzeSymptomValidation } = require('../validators/symptom.validator');

const router = express.Router();

// All symptom routes require authentication
router.use(protect);

/**
 * POST /api/symptoms/analyze
 *
 * Body:
 *   { message: string, sessionId?: string }
 *
 * Success (200):
 *   { data: { sessionId, response, isNewSession, messageCount } }
 *
 * Errors:
 *   401 — Not authenticated
 *   422 — Validation failed (empty message, message too long)
 *   429 — Rate limit exceeded
 *   400 — Gemini content safety block
 *   503 — Gemini service unavailable
 */
router.post(
  '/analyze',
  aiStandardLimiter,
  ...analyzeSymptomValidation,
  SymptomController.analyzeSymptoms
);

/**
 * GET /api/symptoms/sessions
 *
 * No body required — identity from JWT.
 *
 * Success (200):
 *   { data: { sessions: [...], count: number } }
 */
router.get('/sessions', SymptomController.getSessions);

/**
 * GET /api/symptoms/sessions/:sessionId
 *
 * Params: sessionId — UUID from a previous analyzeSymptoms response
 *
 * Success (200):
 *   { data: { session: { sessionId, title, messages: [...] } } }
 *
 * Errors:
 *   404 — Session not found or belongs to another user
 */
router.get('/sessions/:sessionId', SymptomController.getSession);

module.exports = router;
