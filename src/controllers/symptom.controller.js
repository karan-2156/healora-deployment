/**
 * Symptom Controller
 *
 * HTTP layer for the AI symptom checker.
 * All business logic lives in symptom.service.js.
 *
 * ENDPOINTS HANDLED:
 *   POST /api/symptoms/analyze           — Send a symptom message, get AI response
 *   GET  /api/symptoms/sessions          — List all past symptom chat sessions
 *   GET  /api/symptoms/sessions/:sid     — Get full message history for one session
 *
 * CONTROLLER RESPONSIBILITIES (only these):
 *   1. Read input from req.body / req.params / req.user
 *   2. Call the relevant service method
 *   3. Shape and send the HTTP response using sendSuccess()
 *   4. Let asyncWrapper forward any thrown AppError to the global error handler
 *
 * DESIGN DECISION — req.user.id vs req.user._id:
 *   Mongoose documents expose both .id (string) and ._id (ObjectId).
 *   We use req.user._id throughout so service layers can pass it
 *   directly to Mongoose queries without manual toString() conversion.
 */

const SymptomService  = require('../services/symptom.service');
const { sendSuccess } = require('../utils/response.utils');
const asyncWrapper    = require('../utils/asyncWrapper');

// ─────────────────────────────────────────────────────────────
// POST /api/symptoms/analyze
// ─────────────────────────────────────────────────────────────
/**
 * Sends the user's message to Gemini and returns the AI response.
 * Creates a new session if sessionId is absent, or continues an existing one.
 *
 * Request body:
 *   {
 *     message:   string  (required) — user's symptom description or follow-up
 *     sessionId: string  (optional) — UUID from a previous response to continue chat
 *   }
 *
 * Response (200):
 *   {
 *     success: true,
 *     message: "...",
 *     data: {
 *       sessionId:    string  — use this in the next request to continue the chat
 *       response:     string  — Gemini's response
 *       isNewSession: boolean — true when a new chat session was started
 *       messageCount: number  — total messages in the session (for frontend display)
 *     }
 *   }
 */
exports.analyzeSymptoms = asyncWrapper(async (req, res) => {
  const { message, sessionId } = req.body;

  const result = await SymptomService.analyzeSymptoms({
    userId:    req.user._id,
    message,
    sessionId: sessionId || null
  });

  return sendSuccess(
    res,
    result,
    result.isNewSession
      ? 'New conversation started. Here is the AI response.'
      : 'Response generated successfully.'
  );
});

// ─────────────────────────────────────────────────────────────
// GET /api/symptoms/sessions
// ─────────────────────────────────────────────────────────────
/**
 * Returns a list of the user's past symptom checker sessions.
 * Returns metadata only (title, date, message count) — not full message content.
 * Use GET /sessions/:sid to load a specific session's messages.
 *
 * Response (200):
 *   {
 *     success: true,
 *     message: "...",
 *     data: {
 *       sessions: [{ sessionId, title, messageCount, updatedAt }]
 *     }
 *   }
 */
exports.getSessions = asyncWrapper(async (req, res) => {
  const sessions = await SymptomService.getUserSessions(req.user._id);

  return sendSuccess(
    res,
    { sessions, count: sessions.length },
    'Chat sessions retrieved successfully.'
  );
});

// ─────────────────────────────────────────────────────────────
// GET /api/symptoms/sessions/:sessionId
// ─────────────────────────────────────────────────────────────
/**
 * Returns the full message history for a single session.
 * Validates that the session belongs to the requesting user (done in service).
 *
 * Params:
 *   sessionId — the UUID from a previous analyzeSymptoms response
 *
 * Response (200):
 *   {
 *     success: true,
 *     data: {
 *       session: { sessionId, title, feature, messages: [], createdAt, updatedAt }
 *     }
 *   }
 */
exports.getSession = asyncWrapper(async (req, res) => {
  const { sessionId } = req.params;

  const session = await SymptomService.getSession(req.user._id, sessionId);

  return sendSuccess(
    res,
    { session },
    'Session retrieved successfully.'
  );
});
