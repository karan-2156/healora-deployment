/**
 * Report Controller
 *
 * HTTP layer for medical report upload and AI analysis.
 * All business logic (PDF parsing, Gemini calls, DB persistence) lives in report.service.js.
 *
 * ENDPOINTS HANDLED:
 *   POST   /api/reports/upload   — Upload PDF, extract text, analyze with Gemini
 *   GET    /api/reports          — List all reports for the authenticated user
 *   GET    /api/reports/:id      — Get one report with full AI analysis
 *   DELETE /api/reports/:id      — Delete a report
 *
 * DESIGN DECISION — File validation in middleware vs controller:
 *   The `handleUploadErrors` middleware (upload.middleware.js) runs before
 *   this controller. If the file is:
 *     - Wrong type (not PDF)         → 400 from Multer file filter
 *     - Too large (> 5MB)            → 413 from Multer size limit
 *     - Wrong field name             → 400 from Multer
 *   In all these cases, the controller never runs.
 *
 *   If `handleUploadErrors` passes but req.file is somehow undefined
 *   (e.g., the client sent a form with no file), we check for that
 *   here and return a clear 400 error rather than crashing downstream.
 *
 * DESIGN DECISION — Report ID validation:
 *   MongoDB ObjectIds are 24-character hex strings. If a client sends
 *   an invalid format (e.g., "abc"), Mongoose throws a CastError that
 *   would appear as an unhandled error. We validate the ID format here
 *   so the global error handler sees an AppError(400) instead of a
 *   CastError, which produces a cleaner response.
 *   IMPROVEMENT: Add a shared `validateObjectId` middleware in Phase 7
 *   so every route with :id params gets this protection automatically.
 */

const mongoose       = require('mongoose');
const ReportService  = require('../services/report.service');
const AppError       = require('../utils/AppError');
const { sendSuccess } = require('../utils/response.utils');
const asyncWrapper   = require('../utils/asyncWrapper');

// ─────────────────────────────────────────────────────────────
// POST /api/reports/upload
// ─────────────────────────────────────────────────────────────
/**
 * Handles PDF upload, text extraction, Gemini analysis, and persistence.
 *
 * Expected: multipart/form-data with field name "report" containing the PDF.
 *
 * Middleware chain before this controller:
 *   protect → aiUploadLimiter → handleUploadErrors → uploadReport
 *
 * req.file (set by Multer):
 *   { buffer, originalname, size, mimetype }
 *
 * Response (201):
 *   {
 *     success: true,
 *     data: {
 *       report: {
 *         _id, originalFileName, pageCount, fileSizeBytes,
 *         aiSummary, keyFindings, modelUsed, createdAt,
 *         recommendations, urgencyLevel, urgencyReason  ← from AI parse
 *       }
 *     }
 *   }
 */
exports.uploadReport = asyncWrapper(async (req, res) => {

  if (!req.file) {
    throw new AppError(
      'No file received. Please upload a PDF file using the "report" form field.',
      400
    );
  }

  console.log("MULTER FILE PATH:", req.file.path);

  const report = await ReportService.uploadAndAnalyzeReport({
    userId: req.user._id,
    originalName: req.file.originalname,
    fileSizeBytes: req.file.size,
    storedFileName: req.file.filename,
    filePath: req.file.path,
    publicFilePath: `/uploads/reports/${req.file.filename}`,
    mimeType: req.file.mimetype
  });

  // TEMPORARY DEBUG LOGS
  console.log("✅ SERVICE FINISHED");
  console.log("REPORT ID:", report._id);

  const response = sendSuccess(
    res,
    { report },
    'Medical report uploaded and analyzed successfully.',
    201
  );

  console.log("✅ RESPONSE SENT");

  return response;
});
// ─────────────────────────────────────────────────────────────
// GET /api/reports
// ─────────────────────────────────────────────────────────────
/**
 * Returns a list of all the user's analyzed reports, newest first.
 * The heavy `extractedText` field is excluded from the list to keep
 * responses small. Fetch a single report by ID to get the full content.
 *
 * Response (200):
 *   {
 *     success: true,
 *     data: {
 *       reports: [{ _id, originalFileName, pageCount, aiSummary, keyFindings, createdAt }],
 *       count:   number
 *     }
 *   }
 */
exports.getReports = asyncWrapper(async (req, res) => {
  const reports = await ReportService.getUserReports(req.user._id);

  return sendSuccess(
    res,
    { reports, count: reports.length },
    'Reports retrieved successfully.'
  );
});

// ─────────────────────────────────────────────────────────────
// GET /api/reports/:id
// ─────────────────────────────────────────────────────────────
/**
 * Returns a single report with full content including extractedText.
 * Validates MongoDB ObjectId format before querying.
 *
 * Params: id — MongoDB ObjectId of the report
 *
 * Response (200):
 *   {
 *     success: true,
 *     data: { report: { ...all fields including extractedText } }
 *   }
 */
exports.getReportById = asyncWrapper(async (req, res) => {
  // Validate ObjectId format to prevent CastError in Mongoose
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid report ID format.', 400);
  }

  const report = await ReportService.getReportById(req.user._id, req.params.id);

  return sendSuccess(
    res,
    { report },
    'Report retrieved successfully.'
  );
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/reports/:id
// ─────────────────────────────────────────────────────────────
/**
 * Deletes a report. Ownership is validated in the service layer
 * (findOneAndDelete with both _id and userId).
 *
 * Response (200):
 *   { success: true, message: '...', data: null }
 */
exports.deleteReport = asyncWrapper(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid report ID format.', 400);
  }

  await ReportService.deleteReport(req.user._id, req.params.id);

  return sendSuccess(
    res,
    null,
    'Report deleted successfully.'
  );
});
