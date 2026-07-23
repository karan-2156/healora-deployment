/**
 * Symptom Service
 *
 * Handles the business logic for the conversational symptom checker:
 *   - Loading or creating a ChatHistory session
 *   - Transforming stored messages to Gemini's required format
 *   - Calling Gemini and getting a response
 *   - Persisting the new messages to MongoDB
 *
 * DESIGN DECISION — Session ID lifecycle:
 *
 *   The sessionId ties a series of messages into one conversation.
 *   Flow:
 *     1. User sends first message → no sessionId in body.
 *        Server generates one with crypto.randomUUID() and creates
 *        a new ChatHistory document.
 *     2. Response includes the sessionId.
 *        Frontend stores it (e.g., in React state).
 *     3. User sends follow-up → includes sessionId.
 *        Server loads existing session, appends new messages.
 *
 *   WHY server-generated IDs?
 *   Client-provided IDs could collide or be crafted to access
 *   another user's session. Server-generated UUIDs eliminate both risks.
 *   If the client provides a sessionId we don't find for this user,
 *   we create a new session rather than throwing an error (forgiving UX).
 *
 * DESIGN DECISION — Message history format transformation:
 *
 *   Our DB stores:   { role: 'user'|'model', content: 'text', timestamp }
 *   Gemini expects: { role: 'user'|'model', parts: [{ text: 'text' }] }
 *
 *   We transform on every request. This keeps the DB schema clean and
 *   independent of the Gemini SDK's internal format, which could change
 *   between SDK versions.
 *
 * DESIGN DECISION — System instruction is not stored in history:
 *   The SYMPTOM_CHECKER_SYSTEM_INSTRUCTION is passed to Gemini as a
 *   systemInstruction parameter (not as a history entry). This means
 *   it never appears in the stored ChatHistory and doesn't count toward
 *   the conversation length. Gemini applies it freshly on every call.
 */

const crypto  = require('crypto');
const { ChatHistory }  = require('../models');
const GeminiService    = require('./gemini.service');
const AppError         = require('../utils/AppError');
const { SYMPTOM_CHECKER_SYSTEM_INSTRUCTION } = require('../utils/prompts.utils');

/**
 * Analyze symptoms — the core service function.
 *
 * @param {string}      userId    - Authenticated user's MongoDB _id
 * @param {string}      message   - The user's current message
 * @param {string|null} sessionId - Optional: existing session to continue
 * @returns {Promise<object>}     - { sessionId, response, isNewSession }
 */
const analyzeSymptoms = async ({ userId, message, sessionId }) => {
  let session;
  let isNewSession = false;

  // ── Step 1: Load or Create Session ────────────────────────
  if (sessionId) {
    // Try to find the existing session for this user
    session = await ChatHistory.findOne({
      userId,
      sessionId,
      feature: 'symptom_checker'
    });
    // If not found (expired, wrong user, never existed), create a new one
  }

  if (!session) {
    isNewSession = true;
    const newSessionId = crypto.randomUUID();

    // Create a new session with the first message as the title
    session = await ChatHistory.create({
      userId,
      sessionId:  newSessionId,
      feature:    'symptom_checker',
      title:      message.slice(0, 80).trim(), // First 80 chars = readable title
      messages:   [],
      isActive:   true
    });
  }

  // ── Step 2: Transform History to Gemini Format ─────────────
  // Exclude the current message — it goes through sendMessage(), not history.
  // Gemini requires: alternating user/model roles. Our save logic (Step 4)
  // ensures this invariant by always saving both turns together atomically.
  const geminiHistory = session.messages.map((msg) => ({
    role:  msg.role,
    parts: [{ text: msg.content }]
  }));

  // ── Step 3: Call Gemini ────────────────────────────────────
  const aiResponse = await GeminiService.generateChatResponse(
    geminiHistory,
    message,
    SYMPTOM_CHECKER_SYSTEM_INSTRUCTION
  );

  // ── Step 4: Persist Both Messages Atomically ──────────────
  // We add both the user message and the model response in the same
  // .save() call. This ensures the history always has complete turn pairs.
  // If Gemini fails (Step 3), neither message is saved — consistent state.
  session.messages.push(
    { role: 'user',  content: message,    timestamp: new Date() },
    { role: 'model', content: aiResponse, timestamp: new Date() }
  );

  await session.save();

  return {
    sessionId:    session.sessionId,
    response:     aiResponse,
    isNewSession,
    messageCount: session.messages.length
  };
};

/**
 * Get all chat sessions for a user (symptom checker history).
 *
 * Returns session metadata only (title, date, message count).
 * Does NOT return message content — that requires a separate getSession call.
 * This keeps the list response lightweight.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const getUserSessions = async (userId) => {
  // DESIGN DECISION — Use aggregate() not find() for messageCount:
  // MongoDB's $size aggregation operator cannot be used in a standard .find()
  // projection — it's aggregation-only. We use .aggregate() to compute the
  // message count server-side rather than fetching the full messages array
  // and counting in application code.
  //
  // Note: aggregate() does NOT auto-cast types. userId must be a Mongoose
  // ObjectId — it is, because it comes from req.user._id (already an ObjectId).
  const sessions = await ChatHistory.aggregate([
    {
      $match: { userId, feature: 'symptom_checker' }
    },
    {
      $project: {
        sessionId:    1,
        title:        1,
        isActive:     1,
        createdAt:    1,
        updatedAt:    1,
        messageCount: { $size: '$messages' } // Valid here — inside $project stage
      }
    },
    {
      $sort: { updatedAt: -1 } // Most recently active first
    }
  ]);

  return sessions;
};

/**
 * Get a single session with full message history.
 *
 * @param {string} userId
 * @param {string} sessionId
 * @returns {Promise<ChatHistory>}
 */
const getSession = async (userId, sessionId) => {
  const session = await ChatHistory.findOne({
    userId,
    sessionId,
    feature: 'symptom_checker'
  });

  if (!session) {
    throw new AppError('Conversation session not found.', 404);
  }

  return session;
};

module.exports = {
  analyzeSymptoms,
  getUserSessions,
  getSession
};
