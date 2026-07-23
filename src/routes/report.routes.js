/**
 * Medical Report Routes
 * Base path: /api/reports  (mounted in app.js)
 *
 * ─────────────────────────────────────────────────────────────
 * ROUTE MAP:
 *
 *   POST   /api/reports/upload   → Upload PDF → extract text → AI analysis
 *   GET    /api/reports          → List all reports (no extractedText)
 *   GET    /api/reports/:id      → Get one report (full content)
 *   DELETE /api/reports/:id      → Delete a report
 *
 * ─────────────────────────────────────────────────────────────
 * UPLOAD MIDDLEWARE CHAIN (POST /upload only):
 *
 *   protect           — JWT verification, populates req.user
 *   aiUploadLimiter   — 5 uploads / hour (stricter than AI text routes)
 *   handleUploadErrors — Multer: accepts only PDF, max 5MB, memory storage
 *   controller        — Reads req.file.buffer, delegates to ReportService
 *
 * DESIGN DECISION — /upload as a sub-path vs POST to /:
 *   Two common conventions for file upload endpoints:
 *     Option A: POST /api/reports          (REST-pure: creating a resource)
 *     Option B: POST /api/reports/upload   (explicit about the action)
 *
 *   We use Option B because:
 *     - POST /api/reports would conflict with a potential future
 *       "create report manually" endpoint.
 *     - /upload is self-documenting — clients know this takes a file.
 *     - Easier to apply Multer middleware to one specific path.
 *
 * DESIGN DECISION — No PUT (update) endpoint:
 *   Reports are immutable after upload. The AI analysis can't be re-run
 *   on demand in v1 (out of scope). If re-analysis is needed, the user
 *   re-uploads the file. A PUT endpoint creates confusion about what
 *   "updating" a report means.
 *   IMPROVEMENT: Add POST /api/reports/:id/reanalyze in v2 to trigger
 *   a new Gemini call on the stored extractedText without re-uploading.
 *
 * DESIGN DECISION — Content-Type requirement for uploads:
 *   The upload route expects `multipart/form-data` with field name "report".
 *   If the client sends JSON, Multer won't find the file and req.file
 *   will be undefined — caught in the controller with a clear 400 message.
 */

const express            = require('express');
const ReportController   = require('../controllers/report.controller');
const { protect }        = require('../middleware/auth.middleware');
const { aiUploadLimiter } = require('../middleware/rateLimiter.middleware');
const { handleUploadErrors } = require('../middleware/upload.middleware');

const router = express.Router();

// All report routes require authentication
router.use(protect);

/**
 * POST /api/reports/upload
 *
 * Content-Type: multipart/form-data
 * Form field: "report" — the PDF file (max 5MB)
 *
 * Success (201):
 *   {
 *     data: {
 *       report: {
 *         _id, originalFileName, pageCount, fileSizeBytes,
 *         aiSummary, keyFindings, recommendations,
 *         urgencyLevel, urgencyReason, modelUsed, createdAt
 *       }
 *     }
 *   }
 *
 * Errors:
 *   400 — Not a PDF / corrupted file / no text content / scanned PDF
 *   401 — Not authenticated
 *   413 — File exceeds 5MB
 *   429 — Rate limit exceeded (5 uploads/hour)
 *   503 — Gemini service unavailable
 */
router.post(
  '/upload',
  aiUploadLimiter,
  handleUploadErrors,    // Multer: validates type + size, populates req.file
  ReportController.uploadReport
);

/**
 * GET /api/reports
 *
 * Lists all reports for the authenticated user.
 * extractedText is excluded (use GET /:id for full content).
 *
 * Success (200):
 *   { data: { reports: [...], count: number } }
 */
router.get('/', ReportController.getReports);

/**
 * GET /api/reports/:id
 *
 * Returns a single report with full content including extractedText.
 *
 * Params: id — MongoDB ObjectId (24-char hex)
 *
 * Success (200):
 *   { data: { report: { ...all fields including extractedText } } }
 *
 * Errors:
 *   400 — Invalid ObjectId format
 *   404 — Report not found or doesn't belong to user
 */
router.get('/:id', ReportController.getReportById);

/**
 * DELETE /api/reports/:id
 *
 * Permanently deletes a report. Validates ownership before deleting.
 *
 * Params: id — MongoDB ObjectId
 *
 * Success (200):
 *   { success: true, message: 'Report deleted successfully.', data: null }
 *
 * Errors:
 *   400 — Invalid ObjectId format
 *   404 — Report not found or doesn't belong to user
 */
router.delete('/:id', ReportController.deleteReport);

module.exports = router;
