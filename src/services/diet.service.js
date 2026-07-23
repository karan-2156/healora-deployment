/**
 * Diet Service
 *
 * Generates personalized diet recommendations using Gemini.
 * This is a single-turn AI call (not conversational) because the
 * request body provides all necessary context upfront.
 *
 * DESIGN DECISION — No ChatHistory for diet:
 *   Diet recommendations are self-contained: the user provides their
 *   preferences and gets a complete meal plan. There's no meaningful
 *   "continue the diet conversation" pattern in v1.
 *
 *   We store the recommendation in ChatHistory with feature='diet_advisor'
 *   so users can review past recommendations in the dashboard.
 *   IMPROVEMENT: Add conversational diet coaching in v2 using the same
 *   session pattern as the symptom checker.
 *
 * DESIGN DECISION — User profile from req.user vs re-fetching from DB:
 *   We use req.user (already fetched by the `protect` middleware) rather
 *   than making a separate DB call. The protect middleware guarantees
 *   req.user is fresh (fetched from DB on this request), so this is safe.
 */

const crypto = require('crypto');
const { ChatHistory } = require('../models');
const GeminiService   = require('./gemini.service');
const { buildDietPrompt } = require('../utils/prompts.utils');

/**
 * Generate a diet recommendation and store it.
 *
 * @param {object} user        - The authenticated User document (from req.user)
 * @param {object} preferences - Validated request body fields
 * @returns {Promise<object>}  - { recommendation, sessionId }
 */
const getDietRecommendation = async (user, preferences) => {
  // ── Step 1: Build User Profile Context ────────────────────
  // Extract profile fields for the prompt. The virtual `age` getter
  // is called on the Mongoose document.
  const userProfile = {
    age:        user.age,              // Virtual computed from dateOfBirth
    gender:     user.gender,
    bloodGroup: user.bloodGroup
  };

  // ── Step 2: Build the Prompt ───────────────────────────────
  const prompt = buildDietPrompt(userProfile, preferences);

  // ── Step 3: Call Gemini (single-turn) ─────────────────────
  // No system instruction needed here — the role is defined within the prompt itself.
  const recommendation = await GeminiService.generateContent(prompt);

  // ── Step 4: Persist to ChatHistory ────────────────────────
  // Store as a 2-message session: user's preferences + AI recommendation.
  // This gives the user a history of past recommendations to reference.
  const sessionId = crypto.randomUUID();

  await ChatHistory.create({
    userId:    user._id,
    sessionId,
    feature:   'diet_advisor',
    title:     `Diet Plan — ${preferences.fitnessGoal.replace(/_/g, ' ')}`,
    messages:  [
      {
        role:      'user',
        content:   JSON.stringify(preferences), // Store preferences as JSON string
        timestamp: new Date()
      },
      {
        role:      'model',
        content:   recommendation,
        timestamp: new Date()
      }
    ]
  });

  return { recommendation, sessionId };
};

/**
 * Get past diet recommendations for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const getDietHistory = async (userId) => {
  return ChatHistory.find(
    { userId, feature: 'diet_advisor' },
    { sessionId: 1, title: 1, createdAt: 1 }
  ).sort({ createdAt: -1 });
};

module.exports = {
  getDietRecommendation,
  getDietHistory
};
