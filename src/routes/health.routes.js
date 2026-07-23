/**
 * Health Reading Routes
 * Base path: /api/health  (mounted in app.js)
 *
 * ROUTE MAP:
 *   GET    /api/health/summary            → Dashboard summary (parallel aggregation)
 *   GET    /api/health/readings           → List readings (?type=blood_pressure&limit=30)
 *   POST   /api/health/readings           → Log a new reading
 *   GET    /api/health/readings/:id       → Get single reading
 *   DELETE /api/health/readings/:id       → Delete a reading
 *
 * CRITICAL ROUTE ORDER:
 *   /summary and /readings (static) MUST be declared before /readings/:id
 *   (parameterized). Express processes routes in declaration order.
 *   Declaring /:id first would match "summary" as an ID and fail at
 *   validateObjectId with a 400 error before reaching the summary handler.
 *
 * WHY /readings as a sub-path instead of directly at /:id?
 *   The base path /api/health is reserved for future health-related endpoints
 *   that are not readings (e.g., /api/health/goals, /api/health/insights).
 *   Nesting readings under /readings keeps the API extensible.
 *
 * MIDDLEWARE CHAIN:
 *   All routes:      protect
 *   GET /readings:   getReadingsValidation (query param validation)
 *   POST /readings:  logReadingValidation
 *   /readings/:id:   validateObjectId
 */

const express            = require('express');
const HealthController   = require('../controllers/health.controller');
const { protect }        = require('../middleware/auth.middleware');
const validateObjectId   = require('../middleware/validateObjectId.middleware');
const {
  logReadingValidation,
  getReadingsValidation
}                         = require('../validators/health.validator');

const router = express.Router();

router.use(protect);

// ── STATIC ROUTES FIRST (before any :id params) ──────────────

// Dashboard summary — must be before /readings/:id
router.get('/summary', HealthController.getDashboardSummary);

// ── Collection routes under /readings ─────────────────────────
router.get(
  '/readings',
  ...getReadingsValidation,
  HealthController.getReadings
);

router.post(
  '/readings',
  ...logReadingValidation,
  HealthController.logReading
);

// ── Document routes under /readings/:id ──────────────────────
// Declared AFTER static /readings to avoid shadowing it
router.get(
  '/readings/:id',
  validateObjectId('id'),
  HealthController.getReadingById
);

router.delete(
  '/readings/:id',
  validateObjectId('id'),
  HealthController.deleteReading
);

module.exports = router;
