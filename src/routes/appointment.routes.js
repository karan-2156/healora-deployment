/**
 * Appointment Routes
 * Base path: /api/appointments  (mounted in app.js)
 *
 * ROUTE MAP:
 *   GET    /api/appointments              → List appointments
 *                                            ?status=upcoming|completed|cancelled
 *                                            ?upcoming=true (future dates only)
 *   POST   /api/appointments              → Create appointment
 *   GET    /api/appointments/:id          → Get single appointment
 *   PUT    /api/appointments/:id          → Update appointment (partial)
 *   DELETE /api/appointments/:id          → Delete appointment
 *   PATCH  /api/appointments/:id/status   → Update status only (quick dashboard action)
 *
 * MIDDLEWARE CHAIN:
 *   All routes:       protect
 *   :id routes:       validateObjectId
 *   POST:             createAppointmentValidation
 *   PUT:              updateAppointmentValidation
 *   PATCH /:id/status: updateStatusValidation
 */

const express                 = require('express');
const AppointmentController   = require('../controllers/appointment.controller');
const { protect }             = require('../middleware/auth.middleware');
const validateObjectId        = require('../middleware/validateObjectId.middleware');
const {
  createAppointmentValidation,
  updateAppointmentValidation,
  updateStatusValidation
}                              = require('../validators/appointment.validator');

const router = express.Router();

router.use(protect);

// ── Collection routes ──────────────────────────────────────────
router.get('/',  AppointmentController.getAppointments);
router.post('/', ...createAppointmentValidation, AppointmentController.createAppointment);

// ── Document routes ────────────────────────────────────────────
router.get(
  '/:id',
  validateObjectId('id'),
  AppointmentController.getAppointmentById
);

router.put(
  '/:id',
  validateObjectId('id'),
  ...updateAppointmentValidation,
  AppointmentController.updateAppointment
);

router.delete(
  '/:id',
  validateObjectId('id'),
  AppointmentController.deleteAppointment
);

// ── Status action ──────────────────────────────────────────────
// Convenience endpoint for dashboard status toggles (e.g., "Mark as Completed" button)
router.patch(
  '/:id/status',
  validateObjectId('id'),
  ...updateStatusValidation,
  AppointmentController.updateStatus
);

module.exports = router;
