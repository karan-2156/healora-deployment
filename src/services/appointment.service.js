/**
 * Appointment Service
 *
 * Business logic for the personal appointment scheduler.
 *
 * DESIGN DECISIONS:
 *
 * 1. FILTERING BY STATUS AND DATE:
 *    getUserAppointments accepts optional filters:
 *      - status:   'upcoming' | 'completed' | 'cancelled' | undefined (all)
 *      - upcoming: true  → only appointments with appointmentDate >= today
 *    This allows the dashboard to show upcoming appointments while the
 *    full history page shows all appointments.
 *
 * 2. SORT ORDER:
 *    Upcoming appointments sorted by date ASC (soonest first — dashboard UX).
 *    Completed/cancelled sorted by date DESC (most recent first — history UX).
 *    We handle this by applying different sort orders based on the status filter.
 *
 * 3. SEPARATE updateStatus() vs updateAppointment():
 *    updateStatus() is a dedicated function for status transitions.
 *    Reason: A status change from 'upcoming' to 'completed' might have
 *    different business rules than a full update in future (e.g., trigger
 *    a follow-up reminder, update statistics). Keeping them separate now
 *    makes adding that logic easy without refactoring.
 *
 * 4. NO HARD DELETE for appointments:
 *    We do hard-delete in this service (findOneAndDelete), which matches
 *    the reminder pattern. For v1, there's no auditing requirement.
 *    IMPROVEMENT: Soft-delete (set status to 'cancelled' instead of deleting)
 *    if appointment history needs to be preserved for analytics.
 */

const { Appointment } = require('../models');
const AppError         = require('../utils/AppError');

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────
/**
 * Creates a new appointment. Default status is 'upcoming' (set in model).
 *
 * @param {string} userId
 * @param {object} data   - Validated body fields
 * @returns {Promise<Appointment>}
 */
const createAppointment = async (userId, data) => {
  return Appointment.create({ userId, ...data });
};

// ─────────────────────────────────────────────────────────────
// READ ALL (with filters)
// ─────────────────────────────────────────────────────────────
/**
 * Returns appointments for a user with optional filters.
 *
 * @param {string}  userId
 * @param {object}  options
 * @param {string}  [options.status]   - Filter by status (upcoming/completed/cancelled)
 * @param {boolean} [options.upcoming] - If true, only future appointments
 * @returns {Promise<Appointment[]>}
 */
const getUserAppointments = async (userId, { status, upcoming } = {}) => {
  const filter = { userId };

  if (status) filter.status = status;

  // Filter for future dates only (dashboard widget)
  if (upcoming) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    filter.appointmentDate = { $gte: today };
  }

  // Upcoming → sort soonest first; history → most recent first
  const sortOrder = (upcoming || status === 'upcoming') ? 1 : -1;

  return Appointment.find(filter).sort({ appointmentDate: sortOrder });
};

// ─────────────────────────────────────────────────────────────
// READ ONE
// ─────────────────────────────────────────────────────────────
/**
 * @param {string} userId
 * @param {string} appointmentId
 * @returns {Promise<Appointment>}
 * @throws  {AppError} 404
 */
const getAppointmentById = async (userId, appointmentId) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, userId });

  if (!appointment) {
    throw new AppError('Appointment not found or does not belong to your account.', 404);
  }

  return appointment;
};

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────
/**
 * Partially updates an appointment.
 *
 * @param {string} userId
 * @param {string} appointmentId
 * @param {object} updates
 * @returns {Promise<Appointment>}
 * @throws  {AppError} 404
 */
const updateAppointment = async (userId, appointmentId, updates) => {
  const appointment = await Appointment.findOneAndUpdate(
    { _id: appointmentId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!appointment) {
    throw new AppError('Appointment not found or does not belong to your account.', 404);
  }

  return appointment;
};

// ─────────────────────────────────────────────────────────────
// UPDATE STATUS ONLY
// ─────────────────────────────────────────────────────────────
/**
 * Updates only the status of an appointment.
 * Used by PATCH /:id/status for quick status transitions from the dashboard.
 *
 * @param {string} userId
 * @param {string} appointmentId
 * @param {string} status   - 'upcoming' | 'completed' | 'cancelled'
 * @returns {Promise<Appointment>}
 */
const updateAppointmentStatus = async (userId, appointmentId, status) => {
  return updateAppointment(userId, appointmentId, { status });
};

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────
/**
 * @param {string} userId
 * @param {string} appointmentId
 * @returns {Promise<void>}
 * @throws  {AppError} 404
 */
const deleteAppointment = async (userId, appointmentId) => {
  const appointment = await Appointment.findOneAndDelete({ _id: appointmentId, userId });

  if (!appointment) {
    throw new AppError('Appointment not found or does not belong to your account.', 404);
  }
};

module.exports = {
  createAppointment,
  getUserAppointments,
  getAppointmentById,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment
};
