/**
 * Medicine Reminder Routes
 * Base path: /api/reminders  (mounted in app.js)
 *
 * ROUTE MAP:
 *   GET    /api/reminders                → List reminders (?active=true for dashboard)
 *   POST   /api/reminders                → Create reminder
 *   GET    /api/reminders/:id            → Get single reminder
 *   PUT    /api/reminders/:id            → Update reminder (partial)
 *   DELETE /api/reminders/:id            → Delete reminder
 *   PATCH  /api/reminders/:id/toggle     → Toggle isActive on/off
 *
 * MIDDLEWARE CHAIN:
 *   All routes: protect (JWT required)
 *   :id routes: validateObjectId (prevents CastError on bad IDs)
 *   POST/PUT:   validators (input validation)
 *
 * DESIGN DECISION — router.use(protect) vs per-route protect:
 *   Applying protect via router.use() as the first middleware means ALL
 *   routes in this file require authentication automatically.
 *   This is safer than adding protect per-route (easy to forget one).
 *
 * DESIGN DECISION — /toggle route before /:id route:
 *   Express matches routes top-to-bottom. Without careful ordering,
 *   GET /reminders/toggle would try to match /:id with "toggle" as the ID
 *   and fail at validateObjectId. Static sub-paths (/toggle) must come
 *   BEFORE parameterized paths (/:id). Same principle applies to /primary,
 *   /status, /summary in other route files.
 */

const express              = require('express');
const ReminderController   = require('../controllers/reminder.controller');
const { protect }          = require('../middleware/auth.middleware');
const validateObjectId     = require('../middleware/validateObjectId.middleware');
const {
  createReminderValidation,
  updateReminderValidation
}                           = require('../validators/reminder.validator');

const router = express.Router();

// All reminder routes require a valid JWT
router.use(protect);

// ── Collection routes (no :id) ─────────────────────────────────
router.get('/',    ReminderController.getReminders);
router.post('/',   ...createReminderValidation, ReminderController.createReminder);

// ── Document routes (with :id) ────────────────────────────────
// validateObjectId runs before every /:id route to catch bad ID formats early
router.get(
  '/:id',
  validateObjectId('id'),
  ReminderController.getReminderById
);

router.put(
  '/:id',
  validateObjectId('id'),
  ...updateReminderValidation,
  ReminderController.updateReminder
);

router.delete(
  '/:id',
  validateObjectId('id'),
  ReminderController.deleteReminder
);

// ── Action routes (sub-paths on :id) ─────────────────────────
// IMPORTANT: These are defined using the full /:id/action path so Express
// doesn't try to match 'toggle' as an ID value.
router.patch(
  '/:id/toggle',
  validateObjectId('id'),
  ReminderController.toggleReminder
);
router.patch(
  '/:id/complete',
  validateObjectId('id'),
  ReminderController.completeReminder
);
module.exports = router; 