/**
 * ChatHistory Model
 *
 * Persists conversations from the AI symptom checker and diet advisor.
 * Conversations are grouped into Sessions. Each session has an ordered
 * array of messages alternating between 'user' and 'model' roles.
 *
 * DESIGN DECISIONS:
 *
 * 1. EMBEDDED MESSAGES ARRAY (vs. separate Message collection):
 *
 *    Option A (chosen) — Embed messages inside the session document.
 *      Pros: Single read per session, no JOIN-equivalent lookups, simpler code.
 *      Cons: MongoDB 16MB document limit. For most health chats (10–30 messages
 *            per session), this is nowhere near the limit.
 *
 *    Option B — Separate `Message` collection, referenced by sessionId.
 *      Pros: Handles very long conversations cleanly.
 *      Cons: Multiple round-trips to load a full session. Overkill for v1.
 *
 *    CHOSEN: Option A. If average messages per session exceed 100, migrate to B.
 *
 * 2. sessionId:
 *    - A UUID generated on the frontend when the user starts a new conversation.
 *    - Groups messages belonging to one continuous chat.
 *    - Allows multiple independent chat sessions per user.
 *    - IMPROVEMENT: Auto-generate sessionId server-side using crypto.randomUUID()
 *      if the client doesn't provide one.
 *
 * 3. feature FIELD:
 *    - Distinguishes which AI feature the session belongs to.
 *    - Allows separate chat histories for symptom checker vs. diet advisor
 *      on the frontend without filtering by content.
 *
 * 4. title:
 *    - Auto-generated from the user's first message in the controller
 *      (e.g., first 60 characters of the first message).
 *    - Lets the user see a meaningful label in chat history list view.
 *
 * 5. Message roles use 'model' not 'assistant':
 *    - Gemini API uses 'user' and 'model' (not 'assistant').
 *    - We mirror this convention so stored messages can be passed directly
 *      to the Gemini SDK as conversation history without transformation.
 */

const mongoose = require('mongoose');

// ── Subdocument: Individual Message ──────────────────────────
const MessageSchema = new mongoose.Schema(
  {
    // 'user' = patient message | 'model' = Gemini AI response
    role: {
      type: String,
      enum: {
        values: ['user', 'model'],
        message: "Role must be 'user' or 'model'"
      },
      required: true
    },

    // The text content of the message
    content: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      maxlength: [8000, 'Message content is too long']
    },

    // When this specific message was sent
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false } // Sub-documents don't need their own _id — saves space
);

// ── Main Schema ───────────────────────────────────────────────
const ChatHistorySchema = new mongoose.Schema(
  {
    // ── Ownership ───────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },

    // ── Session Identity ────────────────────────────────────
    // Unique identifier grouping all messages in one conversation
    sessionId: {
      type: String,
      required: [true, 'Session ID is required'],
      trim: true
    },

    // Human-readable title derived from the first user message
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Session title cannot exceed 100 characters'],
      default: 'New Conversation'
    },

    // Which AI feature this session belongs to
    feature: {
      type: String,
      enum: {
        values: ['symptom_checker', 'diet_advisor'],
        message: '{VALUE} is not a recognized feature'
      },
      required: [true, 'Feature type is required']
    },

    // ── Messages ────────────────────────────────────────────
    // Ordered array of user and model messages
    messages: {
      type: [MessageSchema],
      default: []
    },

    // ── Session State ───────────────────────────────────────
    // Once closed, no more messages can be appended (UI shows it as read-only)
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { versionKey: false }
  }
);

// ── Indexes ───────────────────────────────────────────────────
// Load a specific session (most common single-session query)
ChatHistorySchema.index(
  { userId: 1, sessionId: 1 },
  { unique: true, name: 'idx_chat_user_session' }
);

// List all sessions for a user, newest first (history list view)
ChatHistorySchema.index(
  { userId: 1, createdAt: -1 },
  { name: 'idx_chat_user_date' }
);

// Filter sessions by feature type (symptom vs diet)
ChatHistorySchema.index(
  { userId: 1, feature: 1 },
  { name: 'idx_chat_user_feature' }
);

module.exports = mongoose.model('ChatHistory', ChatHistorySchema);
