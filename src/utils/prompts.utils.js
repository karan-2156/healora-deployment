/**
 * Prompt Utilities — Centralized Gemini Prompt Templates
 *
 * DESIGN DECISION — Why centralize prompts here?
 *
 * Prompts are the most important and most frequently tuned part of any
 * AI-powered feature. Scattering them across service files makes them
 * hard to find, compare, and improve. Centralizing them means:
 *   - One file to review for AI safety and tone consistency.
 *   - Easy A/B testing: swap a prompt, redeploy, measure quality.
 *   - Non-engineers (medical reviewers, UX writers) can review prompts
 *     without reading service code.
 *
 * PROMPT ENGINEERING CONVENTIONS USED HERE:
 *   1. System instructions define ROLE, CONSTRAINTS, and FORMAT separately.
 *   2. Dynamic data is injected via template functions, not string concatenation.
 *   3. Every medical prompt includes an explicit safety disclaimer instruction.
 *   4. Output format is specified precisely to make parsing reliable.
 *   5. Edge cases (empty text, non-medical reports) are handled in the prompt.
 *
 * IMPROVEMENT:
 *   Store prompts in a database or config file (JSON/YAML) with version numbers.
 *   This allows prompt updates without code deployments.
 */

// ─────────────────────────────────────────────────────────────
// 1. SYMPTOM CHECKER — System Instruction
// ─────────────────────────────────────────────────────────────
/**
 * This is passed as `systemInstruction` to the Gemini model for
 * every symptom checker conversation. It defines the assistant's
 * persona, guardrails, and response format for the entire session.
 *
 * WHY A SYSTEM INSTRUCTION OVER A PREPENDED MESSAGE?
 * System instructions are processed differently by the model — they
 * set persistent context that influences every turn without appearing
 * in the conversation history. This keeps the chat history clean
 * and prevents the system context from being "forgotten" in long chats.
 */
const SYMPTOM_CHECKER_SYSTEM_INSTRUCTION = `
You are an AI health assistant called "HealthAI", designed to help users better understand their symptoms and decide whether to seek medical care.

YOUR ROLE:
- Listen carefully to the user's reported symptoms.
- Ask focused follow-up questions to understand: duration, severity, location, associated symptoms, and relevant medical history.
- Provide clear, empathetic, and educational health information based on what the user describes.
- Help users understand when symptoms require urgent care vs. routine medical attention.

YOUR CONSTRAINTS — YOU MUST FOLLOW THESE STRICTLY:
- NEVER provide a definitive medical diagnosis. You can say "these symptoms are commonly associated with..." but never "you have...".
- NEVER recommend specific prescription medications or dosages.
- NEVER discourage a user from seeking professional medical care.
- ALWAYS recommend emergency services (call 911 or go to the ER) if the user describes: chest pain, difficulty breathing, sudden severe headache, stroke symptoms (face drooping, arm weakness, speech difficulty), severe bleeding, loss of consciousness, or suicidal ideation.
- Keep responses concise. Ask one to two follow-up questions at a time — not a full questionnaire at once.
- Use plain, non-medical language. Explain medical terms when you use them.
- Be empathetic and non-judgmental. Health concerns are personal.

RESPONSE FORMAT:
- Acknowledge what the user shared.
- Provide relevant health information or ask targeted follow-up questions.
- End each response with a brief note reminding the user that you are an AI, not a doctor.

SAFETY DISCLAIMER TO INCLUDE:
At the end of every response, include a one-line reminder: "⚕️ Remember: I'm an AI health assistant, not a doctor. Please consult a healthcare professional for medical advice."
`.trim();

// ─────────────────────────────────────────────────────────────
// 2. DIET RECOMMENDATION — Dynamic Prompt Builder
// ─────────────────────────────────────────────────────────────
/**
 * Builds a complete single-turn prompt for diet recommendations.
 * Takes structured user data and preferences and injects them into
 * the prompt so Gemini has full context to personalize its advice.
 *
 * DESIGN DECISION — Single-turn vs conversational:
 * Diet recommendations are generated as a single comprehensive response
 * (not a back-and-forth chat) because:
 *   1. The request body already contains all necessary user context.
 *   2. Users expect a complete meal plan, not a dialogue.
 *   3. Conversational diet coaching is a v2 feature.
 *
 * @param {object} userProfile    - From User model: age, gender, bloodGroup
 * @param {object} preferences    - From request body: goal, dietary, conditions, etc.
 * @returns {string}              - Complete prompt string ready for Gemini
 */
const buildDietPrompt = (userProfile, preferences) => {
  const {
    fitnessGoal,
    dietaryPreference = 'no restriction',
    healthConditions = 'none reported',
    allergies = [],
    mealsPerDay = 3,
    additionalNotes = ''
  } = preferences;

  const {
    age = 'unknown',
    gender = 'not specified',
    bloodGroup = 'not specified'
  } = userProfile;

  const allergyText = allergies.length > 0
    ? allergies.join(', ')
    : 'none';

  return `
You are a certified AI nutritionist and dietitian. Generate a personalized, evidence-based diet recommendation for the following user.

USER PROFILE:
- Age: ${age !== null && age !== undefined ? age : 'unknown'}
- Gender: ${gender || 'not specified'}
- Blood Group: ${bloodGroup || 'not specified'}

DIETARY GOALS & PREFERENCES:
- Fitness Goal: ${fitnessGoal}
- Dietary Preference: ${dietaryPreference}
- Known Health Conditions: ${healthConditions}
- Food Allergies / Intolerances: ${allergyText}
- Preferred Meals Per Day: ${mealsPerDay}
${additionalNotes ? `- Additional Notes: ${additionalNotes}` : ''}

YOUR TASK:
Provide a comprehensive, personalized diet recommendation that includes:

1. **Overview** (2-3 sentences): Explain why this plan suits the user's profile and goals.

2. **Daily Calorie & Macro Targets**: Estimate daily calorie range and macronutrient split (protein/carbs/fats as percentages). Briefly explain why.

3. **Sample Daily Meal Plan**: Provide a realistic ${mealsPerDay}-meal plan for one day. For each meal include:
   - Meal name
   - 3-5 specific food items with approximate portions
   - Estimated calories

4. **Foods to Prioritize**: List 5-7 foods that strongly support this user's goal. One sentence each explaining why.

5. **Foods to Limit or Avoid**: List 3-5 foods to minimize or avoid for this user. One sentence each explaining why.

6. **Practical Tips**: 3-4 actionable, specific tips for this user (not generic advice).

CONSTRAINTS:
- Respect ALL dietary preferences and allergies. Never suggest restricted foods.
- If health conditions are mentioned (e.g., diabetes, hypertension), tailor advice accordingly.
- Do not recommend specific supplements or medications.
- Keep language clear and practical — avoid overly technical nutrition jargon.
- End with: "⚕️ These are AI-generated dietary suggestions. Please consult a registered dietitian or your doctor before making significant changes to your diet, especially if you have health conditions."
`.trim();
};

// ─────────────────────────────────────────────────────────────
// 3. MEDICAL REPORT ANALYSIS — Dynamic Prompt Builder
// ─────────────────────────────────────────────────────────────
/**
 * Builds a prompt for analyzing extracted PDF medical report text.
 *
 * DESIGN DECISION — Structured JSON output:
 * We ask Gemini to respond in a specific JSON schema so the service
 * layer can parse and store individual fields (summary, keyFindings)
 * separately in MongoDB rather than one monolithic text blob.
 *
 * RISK: LLMs sometimes wrap JSON in markdown code fences or add
 * preamble text. The service layer handles this by stripping
 * ```json fences before JSON.parse(). If parsing fails,
 * the raw text is stored as the summary (graceful degradation).
 *
 * @param {string} extractedText - Raw text extracted from the PDF by pdf-parse
 * @param {string} fileName      - Original file name (for context in the prompt)
 * @returns {string}             - Complete prompt string
 */
const buildReportAnalysisPrompt = (extractedText, fileName) => {
  // Truncate very long reports to stay within Gemini's context window.
  // 12,000 characters ≈ ~3,000 tokens, leaving room for the response.
  const MAX_TEXT_LENGTH = 12000;
  const truncated = extractedText.length > MAX_TEXT_LENGTH;
  const textToAnalyze = extractedText.slice(0, MAX_TEXT_LENGTH);

  return `
You are an expert medical AI assistant specializing in interpreting medical reports and lab results.

You have been given the following medical document for analysis:
File Name: ${fileName}
${truncated ? '(Note: This document was truncated for analysis. Original document may contain additional information.)\n' : ''}

--- START OF MEDICAL DOCUMENT ---
${textToAnalyze}
--- END OF MEDICAL DOCUMENT ---

YOUR TASK:
Analyze the above medical document and respond ONLY with a valid JSON object in exactly this format. Do not include any text before or after the JSON object. Do not use markdown code fences.

{
  "summary": "A clear 3-5 sentence plain-language summary of what this report is about, what tests were conducted, and the overall impression. Written for a patient with no medical background.",
  "keyFindings": [
    "Finding 1: specific abnormal or notable result with plain-language explanation",
    "Finding 2: ...",
    "Add more as needed. Include both normal and abnormal findings of significance. If all results are normal, state that clearly."
  ],
  "recommendations": [
    "Specific action or follow-up recommended based on this report",
    "Add more as needed"
  ],
  "urgencyLevel": "low | medium | high",
  "urgencyReason": "One sentence explaining the urgency level. 'high' means immediate medical attention is recommended."
}

CONSTRAINTS:
- Never provide a medical diagnosis. Describe findings and what they may indicate.
- If the document does not appear to be a medical report (e.g., it's a prescription, referral letter, or unrelated document), set summary to "This document does not appear to be a standard medical lab report." and set keyFindings to an empty array.
- If the extracted text is too garbled to interpret, set summary to "The document text could not be clearly interpreted. Please ensure the PDF contains readable text."
- Always complete the JSON object. Never leave the response incomplete.
- urgencyLevel must be exactly one of: "low", "medium", or "high".
`.trim();
};

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────
module.exports = {
  SYMPTOM_CHECKER_SYSTEM_INSTRUCTION,
  buildDietPrompt,
  buildReportAnalysisPrompt
};
