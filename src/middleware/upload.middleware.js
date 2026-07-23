/**
 * Upload Middleware — Multer PDF Configuration
 *
 * DESIGN DECISIONS:
 *
 * 1. MEMORY STORAGE vs DISK STORAGE:
 *
 *    Option A (chosen) — memoryStorage():
 *      The uploaded file is held in a Buffer in RAM (req.file.buffer).
 *      No file is ever written to disk.
 *      Pros:
 *        - No filesystem cleanup needed.
 *        - No race conditions between upload, processing, and deletion.
 *        - Works cleanly in containerized/serverless environments with
 *          read-only filesystems (e.g., AWS App Runner, Lambda).
 *        - pdf-parse accepts a Buffer directly — no path needed.
 *      Cons:
 *        - For very large files, RAM usage spikes. Mitigated by our 10 MB limit.
 *        - If the Node process crashes during upload, the file is gone.
 *          (Acceptable for v1 since we only need the text, not the file.)
 *
 *    Option B — diskStorage():
 *      Writes to `uploads/` directory, service reads the path.
 *      Pros: Handles larger files, doesn't spike RAM.
 *      Cons: Requires explicit `fs.unlink()` cleanup after every request
 *            (success, error, timeout). Easy to miss and accumulate disk usage.
 *
 *    CHOSEN: memoryStorage. 5MB limit makes RAM usage acceptable.
 *    IMPROVEMENT: Switch to diskStorage + cleanup if max file size is increased.
 *
 * 2. FILE FILTER — MIME TYPE + EXTENSION:
 *    We validate BOTH the MIME type AND the file extension.
 *    Why both?
 *    - MIME type (`file.mimetype`) is set by the HTTP client, which can lie.
 *      A malicious client could send a .exe with mimetype "application/pdf".
 *    - File extension is read from the original filename — also spoofable.
 *    - Validating both is defense in depth. Neither alone is sufficient.
 *    - NOTE: True file type detection requires reading the file header (magic bytes).
 *      IMPROVEMENT: Use the `file-type` npm package to check magic bytes for
 *      production-grade validation.
 *
 * 3. SIZE LIMIT:
 *    5MB is enforced at the Multer level (not just application level).
 *    Multer rejects oversized files before the handler runs, returning a
 *    MulterError with code 'LIMIT_FILE_SIZE'. The error handler middleware
 *    in app.js catches and formats this as a 413 response.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/AppError');

// Read max size from env (set in .env.example as MAX_PDF_SIZE_MB=5)
const MAX_SIZE_BYTES = (parseInt(process.env.MAX_PDF_SIZE_MB, 10) || 10) * 1024 * 1024;

// ── Storage: Memory (no disk writes) ─────────────────────────
const uploadDir = path.resolve(process.cwd(), "uploads", "reports");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
    console.log("UPLOAD DIRECTORY:", uploadDir);
    cb(null, uploadDir);
},

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() + "-" + file.originalname.replace(/\s+/g, "_");

        cb(null, uniqueName);

    }

});

// ── File Filter: PDF Only ─────────────────────────────────────
const pdfFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf"
  ];

  const allowedExtensions = [
    ".pdf"
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = allowedMimeTypes.includes(file.mimetype);
  const extOk = allowedExtensions.includes(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type. Only PDF files are accepted. Received: ${file.mimetype || 'unknown type'}`,
        400
      ),
      false
    );
  }
};
// ── Multer Instance ───────────────────────────────────────────
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_SIZE_BYTES,   // Hard limit enforced by Multer before handler
    files: 1                    // Only one file per request
  },
  fileFilter: pdfFilter
});

/**
 * uploadSinglePDF — middleware for routes that accept one PDF.
 *
 * Usage in a route:
 *   router.post('/upload', protect, uploadSinglePDF, ReportController.upload);
 *
 * After this middleware runs successfully:
 *   req.file.buffer   — the PDF as a Buffer (passes to pdf-parse)
 *   req.file.originalname — original filename (stored in DB)
 *   req.file.size      — file size in bytes (stored in DB)
 *   req.file.mimetype  — 'application/pdf'
 *
 * On failure (wrong type, too large):
 *   Multer calls next(err) where err is either:
 *     - Our AppError (wrong type) → caught by global error handler
 *     - multer.MulterError with code LIMIT_FILE_SIZE → must handle separately
 *
 * The global error handler (Phase 7) will handle MulterError specifically.
 * For now, app.js's basic error handler will catch and format it.
 */
const uploadSinglePDF = upload.single('report');

/**
 * handleUploadErrors — wraps uploadSinglePDF to intercept MulterError
 * and convert it to an AppError for consistent response formatting.
 *
 * DESIGN DECISION: We wrap Multer's middleware in a custom function
 * rather than relying on the global error handler to detect MulterError,
 * because the global handler (Phase 7) should be kept generic.
 * Feature-specific errors are best handled close to where they occur.
 */
const handleUploadErrors = (req, res, next) => {
  uploadSinglePDF(req, res, (err) => {
    if (!err) return next();

    // Multer's own error (file too large, field name mismatch, etc.)
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new AppError(
          `File too large. Maximum allowed size is ${process.env.MAX_PDF_SIZE_MB || 10}MB.`,
          413
        )
      );
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        new AppError(
          'Unexpected field name. Use "report" as the form field name for the PDF file.',
          400
        )
      );
    }

    // AppError from our fileFilter (wrong mime type / extension)
    if (err.isOperational) return next(err);

    // Unknown Multer error
    return next(new AppError(`File upload failed: ${err.message}`, 400));
  });
};

module.exports = { handleUploadErrors };
