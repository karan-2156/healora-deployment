/**
 * Gemini AI Service — Single Wrapper for All Gemini API Calls
 *
 * DESIGN DECISIONS:
 *
 * 1. SINGLETON genAI INSTANCE:
 *    The GoogleGenerativeAI client is created once when first needed
 *    (lazy initialization) and reused across all requests. Creating it
 *    on every request would be wasteful (it reads env vars, sets up
 *    the HTTP client internally).
 *
 * 2. MODEL INSTANCES ARE CREATED PER CALL (not cached):
 *    Each feature (symptom, diet, report) needs a different system
 *    instruction. Creating a new model object is cheap (no network call)
 *    — it just configures parameters. The actual API call happens in
 *    generateContent() / sendMessage(), not in getGenerativeModel().
 *
 * 3. SAFETY SETTINGS:
 *    Applied to ALL model instances. For a health app, we block
 *    DANGEROUS_CONTENT at BLOCK_MEDIUM_AND_ABOVE to prevent the model
 *    from generating harmful medical advice. Other categories are set
 *    to a sensible default.
 *
 *    TRADE-OFF: Stricter safety = more false positives (legitimate health
 *    questions blocked). BLOCK_MEDIUM_AND_ABOVE is the recommended balance
 *    for health applications.
 *
 * 4. TEMPERATURE = 0.4 for medical features:
 *    Lower temperature = more deterministic, factual responses.
 *    Medical information should be consistent and grounded, not creative.
 *    0.4 is a practical balance: predictable but not robotic.
 *
 *    IMPROVEMENT: Allow per-feature temperature overrides if needed
 *    (e.g., diet advice could be slightly more varied at 0.6).
 *
 * 5. ERROR CLASSIFICATION:
 *    Gemini can fail in distinct ways, each requiring a different response:
 *      - Safety block → 400 (user must rephrase, not a server error)
 *      - API key invalid → 500 (config error, not user's fault)
 *      - Rate limit → 429 (temporary, retry later)
 *      - Network error → 503 (service unavailable)
 *    We classify and surface these distinctly.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../utils/AppError');

// ── Singleton Client ──────────────────────────────────────────
let genAI = null;

const getClient = () => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// ── Safety Settings ───────────────────────────────────────────
// Applied to every model instance. String-based to avoid importing
// enums from the SDK (reduces coupling to SDK version).
const SAFETY_SETTINGS = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    // Higher threshold for dangerous content in a health context
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  }
];

// ── Generation Config ─────────────────────────────────────────
// Low temperature for medical content: factual and consistent.
const GENERATION_CONFIG = {
  temperature: 0.4,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 2048
};

// ── Private: Create a Model Instance ─────────────────────────
/**
 * Creates a Gemini model instance with the given system instruction.
 * Model creation itself makes NO network call.
 *
 * @param {string|null} systemInstruction
 * @returns {GenerativeModel}
 */
const _createModel = (systemInstruction = null) => {
  const config = {
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    safetySettings: SAFETY_SETTINGS,
    generationConfig: GENERATION_CONFIG
  };

  // systemInstruction sets the model's persona and constraints for all turns
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  return getClient().getGenerativeModel(config);
};

// ── Private: Safely Extract Text from Gemini Response ────────
/**
 * Extracts text from a Gemini result object with full error classification.
 *
 * WHY NOT JUST response.text()?
 * response.text() throws a generic error if the response was blocked.
 * We catch this and re-throw a classified AppError with a helpful message
 * and the correct HTTP status code.
 *
 * @param {GenerateContentResult} result - Raw result from Gemini API
 * @returns {string} - The generated text
 * @throws {AppError} - With classified status code
 */
const _extractText = (result) => {
  const response = result.response;

  // Check if the prompt or response was blocked by safety filters
  const blockReason = response?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new AppError(
      `Your request was flagged by our content safety system (${blockReason}). ` +
      'Please rephrase your message and try again.',
      400
    );
  }

  // Check if candidates array is empty (another form of blocked response)
  const candidates = response?.candidates;
  if (!candidates || candidates.length === 0) {
    throw new AppError(
      'The AI service did not return a response. Please try again.',
      503
    );
  }

  // Check the finish reason of the first candidate
  const finishReason = candidates[0]?.finishReason;
  if (finishReason === 'SAFETY') {
    throw new AppError(
      'The AI response was blocked due to safety guidelines. Please rephrase your request.',
      400
    );
  }

  if (finishReason === 'MAX_TOKENS') {
    // Response was truncated — still return what we got, it's usable
    console.warn('⚠️  Gemini response was truncated at MAX_TOKENS. Consider increasing maxOutputTokens.');
  }

  try {
    const text = response.text();
    if (!text || text.trim() === '') {
      throw new AppError('The AI returned an empty response. Please try again.', 503);
    }
    return text;
  } catch (err) {
    // If err is already an AppError, re-throw it
    if (err.isOperational) throw err;
    // Otherwise, wrap it
    throw new AppError(
      'Failed to parse the AI response. Please try again.',
      503
    );
  }
};

// ── Private: Classify Gemini API Errors ─────────────────────
/**
 * Maps raw Gemini SDK/network errors to user-friendly AppErrors.
 *
 * @param {Error} err - Raw error from the Gemini SDK
 * @throws {AppError} - Always throws a classified AppError
 */
const _handleGeminiError = (err) => {
  // Already classified — pass through
  if (err.isOperational) throw err;

  const message = err.message || '';

  console.error("========== GEMINI ACTUAL ERROR ==========");
console.error(err);
console.error("GEMINI ERROR MESSAGE:", message);
console.error("=========================================");

  if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
    // Config error — log server-side, don't expose details to client
    console.error('❌  Gemini API key is invalid. Check GEMINI_API_KEY in .env');
    throw new AppError('AI service configuration error. Please contact support.', 500);
  }

  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
    throw new AppError(
      'AI service is temporarily unavailable due to high demand. Please try again in a few minutes.',
      429
    );
  }

  if (message.includes('UNAVAILABLE') || message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
    throw new AppError(
      'AI service is temporarily unreachable. Please try again shortly.',
      503
    );
  }

  // Unknown error — log and return generic message
  console.error('❌  Unclassified Gemini error:', err.message);
  throw new AppError('An unexpected error occurred with the AI service. Please try again.', 500);
};

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Single-turn content generation.
 * Used by: Diet Recommendation, Report Analysis.
 *
 * @param {string} prompt           - The complete prompt string
 * @param {string|null} systemInstruction - Optional persona/constraint for the model
 * @returns {Promise<string>}        - Generated text
 */
const generateContent = async (prompt, systemInstruction = null) => {
  try {
    const model = _createModel(systemInstruction);
    const result = await model.generateContent(prompt);
    return _extractText(result);
  } catch (err) {
    _handleGeminiError(err);
  }
};

/**
 * Multi-turn chat response.
 * Used by: Symptom Checker.
 *
 * The history array contains all PREVIOUS turns (alternating user/model).
 * The newMessage is the CURRENT user input — passed via sendMessage(), not history.
 *
 * Gemini history format:
 *   [{ role: 'user', parts: [{ text: '...' }] }, { role: 'model', parts: [...] }]
 *
 * Our ChatHistory model stores:
 *   [{ role: 'user'|'model', content: '...' }]
 *
 * The service layer performs this transformation before calling here.
 *
 * @param {Array}       geminiHistory     - Prior conversation in Gemini format
 * @param {string}      newMessage        - The current user message
 * @param {string|null} systemInstruction - Model persona and constraints
 * @returns {Promise<string>}              - AI response text
 */
const generateChatResponse = async (geminiHistory, newMessage, systemInstruction = null) => {
  try {
    const model = _createModel(systemInstruction);

    const chat = model.startChat({
      history: geminiHistory
      // systemInstruction is set at model level, not chat level
    });

    const result = await chat.sendMessage(newMessage);
    return _extractText(result);
  } catch (err) {
    _handleGeminiError(err);
  }
};

module.exports = {
  generateContent,
  generateChatResponse
};
