/**
 * Report Service
 *
 * Handles the full medical report analysis pipeline:
 *   File buffer → Text extraction → Gemini analysis → MongoDB persistence
 *
 * DESIGN DECISIONS:
 *
 * 1. PDF TEXT EXTRACTION WITH pdf-parse:
 *    pdf-parse reads a Buffer and returns { text, numpages, info }.
 *    It ONLY works on text-based PDFs (where text is embedded as characters).
 *    Scanned PDFs (image-only) will return empty or near-empty text.
 *    We detect this and throw a meaningful error (OCR is out of scope for v1).
 *
 * 2. MINIMUM TEXT LENGTH CHECK:
 *    If extractedText.trim().length < 50, the PDF is likely:
 *      - A scanned image (no text layer)
 *      - A corrupted file
 *      - A PDF with only metadata/form fields and no content text
 *    We reject these early rather than sending garbage to Gemini.
 *
 * 3. JSON PARSING OF GEMINI RESPONSE:
 *    We prompt Gemini to return pure JSON (see prompts.utils.js).
 *    However, LLMs sometimes:
 *      - Wrap the JSON in ```json ... ``` code fences
 *      - Prepend a sentence before the JSON
 *      - Return slightly malformed JSON
 *
 *    Our parsing strategy:
 *      a) Strip ```json and ``` fences
 *      b) Find the first { and last } to extract the JSON object
 *      c) JSON.parse()
 *      d) If any step fails: GRACEFUL DEGRADATION — store the raw AI text
 *         as the summary, with an empty keyFindings array.
 *         The report is still saved and useful. No crash, no data loss.
 *
 * 4. NO PDF STORAGE:
 *    The binary PDF buffer is never written to disk or stored in MongoDB.
 *    After this service function returns, the buffer is garbage collected.
 *    Only extractedText, aiSummary, and keyFindings are persisted.
 *
 * 5. MAXIMUM TEXT LENGTH SENT TO GEMINI:
 *    Handled in buildReportAnalysisPrompt() (prompts.utils.js):
 *    truncated to 12,000 characters to stay within the model's context window
 *    and keep costs predictable. The full extractedText is stored in MongoDB
 *    even if it was truncated for the AI call.
 */

const { PDFParse } = require('pdf-parse');
const fs = require("fs");
const { MedicalReport } = require('../models');
const GeminiService = require('./gemini.service');
const AppError  = require('../utils/AppError');
const { buildReportAnalysisPrompt } = require('../utils/prompts.utils');

// Minimum meaningful text length from a PDF (anything below = likely a scan)
const MIN_TEXT_LENGTH = 1;

// ─────────────────────────────────────────────────────────────
// Private: Extract Text from PDF Buffer
// ─────────────────────────────────────────────────────────────
/**
 * @param {Buffer} buffer          - Raw PDF file buffer from Multer memory storage
 * @param {string} originalName    - For error messages
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
const _extractPdfText = async (filePath, originalName) => {

    let parsed;

    try {

        const pdfBuffer = fs.readFileSync(filePath);

        const parser = new PDFParse({ data: pdfBuffer });

        parsed = await parser.getText();

        await parser.destroy();

    } catch (err) {
  console.error("PDF Parse Error:", err);

  throw new AppError(
    `Failed to read the PDF file "${originalName}". The PDF could not be parsed.`,
    400
  );
}
  const text = parsed.text || '';
  const pageCount = parsed.total || 0;

  // Reject PDFs that are clearly image-only (scanned without a text layer)
  if (text.trim().length < MIN_TEXT_LENGTH) {
    throw new AppError(
      'No readable text could be extracted from this PDF. The file may be a scanned or image-based PDF. Please upload a digital text-based PDF.',
      400
  );
  }

  return { text, pageCount };
};

// ─────────────────────────────────────────────────────────────
// Private: Parse Gemini's JSON Response
// ─────────────────────────────────────────────────────────────
/**
 * Attempts to parse Gemini's response as JSON.
 * Falls back to treating the entire response as the summary if parsing fails.
 *
 * Expected JSON shape (defined in prompts.utils.js):
 * {
 *   summary:      string,
 *   keyFindings:  string[],
 *   recommendations: string[],
 *   urgencyLevel: 'low' | 'medium' | 'high',
 *   urgencyReason: string
 * }
 *
 * @param {string} rawResponse - Raw text response from Gemini
 * @returns {object}           - Parsed fields with fallbacks
 */
const _parseAIResponse = (rawResponse) => {
  try {
    // Step 1: Strip markdown code fences (```json ... ```)
    let cleaned = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Step 2: Extract the JSON object even if there's text before/after
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new Error('No JSON object found in response');
    }

    cleaned = cleaned.slice(start, end + 1);

    // Step 3: Parse
    const parsed = JSON.parse(cleaned);

    // Step 4: Validate and normalize fields with safe defaults
    return {
      aiSummary:       typeof parsed.summary === 'string'            ? parsed.summary         : rawResponse,
      keyFindings:     Array.isArray(parsed.keyFindings)             ? parsed.keyFindings      : [],
      recommendations: Array.isArray(parsed.recommendations)        ? parsed.recommendations  : [],
      urgencyLevel:    ['low', 'medium', 'high'].includes(parsed.urgencyLevel)
        ? parsed.urgencyLevel
        : 'low',
      urgencyReason:   typeof parsed.urgencyReason === 'string'      ? parsed.urgencyReason    : ''
    };

  } catch (parseError) {
  console.error(
    '❌ Gemini JSON parse error:',
    parseError.message
  );

  console.error(
    '❌ Raw response type:',
    typeof rawResponse
  );

  console.warn(
    '⚠️ Could not parse Gemini JSON response. Storing raw text as summary.'
  );

  return {
    aiSummary: rawResponse,
    keyFindings: [],
    recommendations: [],
    urgencyLevel: 'low',
    urgencyReason: ''
  };
}
};

// ─────────────────────────────────────────────────────────────
// PUBLIC: Upload and Analyze a Report
// ─────────────────────────────────────────────────────────────
/**
 * Full pipeline: buffer → extract → analyze → save → return.
 *
 * @param {object} param0
 * @param {string}   param0.userId        - Authenticated user's _id
 * @param {Buffer}   param0.fileBuffer    - PDF buffer from req.file.buffer
 * @param {string}   param0.originalName  - req.file.originalname
 * @param {number}   param0.fileSizeBytes - req.file.size
 * @returns {Promise<MedicalReport>}      - The saved MedicalReport document
 */
const uploadAndAnalyzeReport = async ({
    userId,
    originalName,
    fileSizeBytes,
    storedFileName,
    filePath,
    publicFilePath,
    mimeType
}) => {
  // ── Step 1: Extract text from PDF buffer ──────────────────
  const { text: extractedText, pageCount } = await _extractPdfText(filePath, originalName);

  // ── Step 2: Build prompt with extracted text ───────────────
  const prompt = buildReportAnalysisPrompt(extractedText, originalName);

  // ── Step 3: Call Gemini for analysis ──────────────────────
  const rawAIResponse = await GeminiService.generateContent(prompt);
  console.log("========== GEMINI RAW RESPONSE ==========");
  console.log(rawAIResponse);
  console.log("========================================");
  

  // ── Step 4: Parse the structured AI response ──────────────
  const { aiSummary, keyFindings, recommendations, urgencyLevel, urgencyReason } =
    _parseAIResponse(rawAIResponse);

  // ── Step 5: Persist to MongoDB ────────────────────────────
  // NOTE: fileBuffer is NOT stored — only the extracted text and analysis.
  // All AI-parsed fields (recommendations, urgencyLevel, urgencyReason) are
  // stored in the model so they are available on every subsequent GET request.
  const report = await MedicalReport.create({

    userId,

    originalFileName: originalName,

    storedFileName,

    filePath: publicFilePath,

    mimeType,

    fileSizeBytes,

    pageCount,

    extractedText,

    aiSummary,

    keyFindings,

    recommendations,

    urgencyLevel,

    urgencyReason,

    modelUsed: process.env.GEMINI_MODEL || "gemini-1.5-flash"

});
  return report;
};

// ─────────────────────────────────────────────────────────────
// PUBLIC: Get Reports List
// ─────────────────────────────────────────────────────────────
/**
 * Returns all reports for a user, sorted newest first.
 * Excludes the full extractedText from the list to keep responses small.
 * Use getReportById() to fetch extractedText for a specific report.
 *
 * @param {string} userId
 * @returns {Promise<MedicalReport[]>}
 */
const getUserReports = async (userId) => {
  return MedicalReport.find(
    { userId },
    { extractedText: 0 }  // Exclude heavy field from list view
  ).sort({ createdAt: -1 });
};

// ─────────────────────────────────────────────────────────────
// PUBLIC: Get Single Report
// ─────────────────────────────────────────────────────────────
/**
 * Returns a single report with full content including extractedText.
 * Validates ownership — users can only access their own reports.
 *
 * @param {string} userId
 * @param {string} reportId
 * @returns {Promise<MedicalReport>}
 */
const getReportById = async (userId, reportId) => {
  const report = await MedicalReport.findOne({ _id: reportId, userId });

  if (!report) {
    throw new AppError(
      'Report not found. It may have been deleted or does not belong to your account.',
      404
    );
  }

  return report;
};

// ─────────────────────────────────────────────────────────────
// PUBLIC: Delete Report
// ─────────────────────────────────────────────────────────────
/**
 * Deletes a report. Validates ownership before deletion.
 *
 * @param {string} userId
 * @param {string} reportId
 * @returns {Promise<void>}
 */
const deleteReport = async (userId, reportId) => {
  const report = await MedicalReport.findOneAndDelete({ _id: reportId, userId });

  if (!report) {
    throw new AppError(
      'Report not found or you do not have permission to delete it.',
      404
    );
  }
};

module.exports = {
  uploadAndAnalyzeReport,
  getUserReports,
  getReportById,
  deleteReport
};
