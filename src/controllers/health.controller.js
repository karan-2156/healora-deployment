/**
 * Health Controller
 *
 * HTTP layer for health readings (blood pressure, weight, blood sugar).
 *
 * ENDPOINTS:
 *   GET    /api/health/summary       → Dashboard summary (latest per type + counts)
 *   GET    /api/health/readings      → List readings (?type=blood_pressure&limit=30)
 *   POST   /api/health/readings      → Log a new reading
 *   GET    /api/health/readings/:id  → Get one reading
 *   DELETE /api/health/readings/:id  → Delete a reading
 *
 * DESIGN DECISION — /summary before /readings in route order:
 *   Express matches routes top-to-bottom. If /readings/:id were declared
 *   first, a request to /summary would try to interpret "summary" as a
 *   MongoDB ObjectId param and fail at the validateObjectId middleware.
 *   Specific paths (/summary) must be declared BEFORE parameterized paths (/:id).
 *   This is enforced in the route file — documented here for clarity.
 *
 * DESIGN DECISION — query param forwarding from controller to service:
 *   We pass req.query directly into service options rather than destructuring
 *   here. The service applies its own defaults and limits. The controller
 *   stays thin — it does not transform query params.
 */

const HealthService   = require('../services/health.service');
const { sendSuccess } = require('../utils/response.utils');
const asyncWrapper    = require('../utils/asyncWrapper');

// GET /api/health/summary
exports.getDashboardSummary = asyncWrapper(async (req, res) => {
  const summary = await HealthService.getDashboardSummary(req.user._id);

  return sendSuccess(
    res,
    summary,
    'Health dashboard summary retrieved successfully.'
  );
});

// GET /api/health/readings
exports.getReadings = asyncWrapper(async (req, res) => {
  // Pass all query params to service — service applies defaults and limits
  const readings = await HealthService.getUserReadings(req.user._id, req.query);

  return sendSuccess(
    res,
    { readings, count: readings.length },
    'Health readings retrieved successfully.'
  );
});

// POST /api/health/readings
exports.logReading = asyncWrapper(async (req, res) => {
  const reading = await HealthService.logReading(req.user._id, req.body);

  return sendSuccess(
    res,
    { reading },
    'Health reading logged successfully.',
    201
  );
});

// GET /api/health/readings/:id
exports.getReadingById = asyncWrapper(async (req, res) => {
  const reading = await HealthService.getReadingById(req.user._id, req.params.id);

  return sendSuccess(res, { reading }, 'Reading retrieved successfully.');
});

// DELETE /api/health/readings/:id
exports.deleteReading = asyncWrapper(async (req, res) => {
  await HealthService.deleteReading(req.user._id, req.params.id);

  return sendSuccess(res, null, 'Health reading deleted successfully.');
});
