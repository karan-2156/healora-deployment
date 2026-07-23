/**
 * Reminder Controller
 *
 * HTTP layer for medicine reminder management.
 * Controllers only: read input → call service → send response.
 *
 * ENDPOINTS:
 *   GET    /api/reminders          → List all reminders (active filter via ?active=true)
 *   POST   /api/reminders          → Create a reminder
 *   GET    /api/reminders/:id      → Get one reminder
 *   PUT    /api/reminders/:id      → Update a reminder
 *   DELETE /api/reminders/:id      → Delete a reminder
 *   PATCH  /api/reminders/:id/toggle → Toggle isActive on/off
 */

const ReminderService = require('../services/reminder.service');
const { sendSuccess } = require('../utils/response.utils');
const asyncWrapper    = require('../utils/asyncWrapper');

// GET /api/reminders
exports.getReminders = asyncWrapper(async (req, res) => {
  // ?active=true → dashboard (active only) | no param → full list
  const activeOnly = req.query.active === 'true';

  const reminders = await ReminderService.getUserReminders(req.user._id, activeOnly);

  return sendSuccess(
    res,
    { reminders, count: reminders.length },
    'Medicine reminders retrieved successfully.'
  );
});

// POST /api/reminders
exports.createReminder = asyncWrapper(async (req, res) => {
  const reminder = await ReminderService.createReminder(req.user._id, req.body);

  return sendSuccess(
    res,
    { reminder },
    'Medicine reminder created successfully.',
    201
  );
});

// GET /api/reminders/:id
exports.getReminderById = asyncWrapper(async (req, res) => {
  const reminder = await ReminderService.getReminderById(req.user._id, req.params.id);

  return sendSuccess(res, { reminder }, 'Reminder retrieved successfully.');
});

// PUT /api/reminders/:id
exports.updateReminder = asyncWrapper(async (req, res) => {
  const reminder = await ReminderService.updateReminder(
    req.user._id,
    req.params.id,
    req.body
  );

  return sendSuccess(res, { reminder }, 'Reminder updated successfully.');
});

// DELETE /api/reminders/:id
exports.deleteReminder = asyncWrapper(async (req, res) => {
  await ReminderService.deleteReminder(req.user._id, req.params.id);

  return sendSuccess(res, null, 'Reminder deleted successfully.');
});

// PATCH /api/reminders/:id/toggle
exports.toggleReminder = asyncWrapper(async (req, res) => {
  const reminder = await ReminderService.toggleReminder(req.user._id, req.params.id);

  const state = reminder.isActive ? 'activated' : 'paused';
  return sendSuccess(res, { reminder }, `Reminder ${state} successfully.`);
});
// PATCH /api/reminders/:id/complete
exports.completeReminder = asyncWrapper(async (req, res) => {

  const reminder = await ReminderService.completeReminder(
    req.user._id,
    req.params.id,
    req.body.time
  );

  return sendSuccess(
    res,
    { reminder },
    'Medicine marked as completed successfully.'
  );
});
