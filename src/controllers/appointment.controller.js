/**
 * Appointment Controller
 *
 * HTTP layer for personal appointment management.
 *
 * ENDPOINTS:
 *   GET    /api/appointments              → List appointments (?status=upcoming&upcoming=true)
 *   POST   /api/appointments              → Create appointment
 *   GET    /api/appointments/:id          → Get one appointment
 *   PUT    /api/appointments/:id          → Full/partial update
 *   DELETE /api/appointments/:id          → Delete appointment
 *   PATCH  /api/appointments/:id/status   → Update status only
 *
 * QUERY PARAMS for GET /api/appointments:
 *   ?status=upcoming|completed|cancelled  → filter by status
 *   ?upcoming=true                        → only future dates (for dashboard widget)
 */

const AppointmentService = require('../services/appointment.service');
const { sendSuccess }    = require('../utils/response.utils');
const asyncWrapper       = require('../utils/asyncWrapper');

// GET /api/appointments
exports.getAppointments = asyncWrapper(async (req, res) => {
  const { status, upcoming } = req.query;

  const appointments = await AppointmentService.getUserAppointments(req.user._id, {
    status:   status   || undefined,
    upcoming: upcoming === 'true'
  });

  return sendSuccess(
    res,
    { appointments, count: appointments.length },
    'Appointments retrieved successfully.'
  );
});

// POST /api/appointments
exports.createAppointment = asyncWrapper(async (req, res) => {
  const appointment = await AppointmentService.createAppointment(req.user._id, req.body);

  return sendSuccess(
    res,
    { appointment },
    'Appointment created successfully.',
    201
  );
});

// GET /api/appointments/:id
exports.getAppointmentById = asyncWrapper(async (req, res) => {
  const appointment = await AppointmentService.getAppointmentById(
    req.user._id,
    req.params.id
  );

  return sendSuccess(res, { appointment }, 'Appointment retrieved successfully.');
});

// PUT /api/appointments/:id
exports.updateAppointment = asyncWrapper(async (req, res) => {
  const appointment = await AppointmentService.updateAppointment(
    req.user._id,
    req.params.id,
    req.body
  );

  return sendSuccess(res, { appointment }, 'Appointment updated successfully.');
});

// DELETE /api/appointments/:id
exports.deleteAppointment = asyncWrapper(async (req, res) => {
  await AppointmentService.deleteAppointment(req.user._id, req.params.id);

  return sendSuccess(res, null, 'Appointment deleted successfully.');
});

// PATCH /api/appointments/:id/status
exports.updateStatus = asyncWrapper(async (req, res) => {
  const appointment = await AppointmentService.updateAppointmentStatus(
    req.user._id,
    req.params.id,
    req.body.status
  );

  return sendSuccess(
    res,
    { appointment },
    `Appointment marked as "${appointment.status}" successfully.`
  );
});
