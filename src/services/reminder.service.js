/**
 * Medicine Reminder Service
 *
 * All business logic for medicine reminders.
 * Controllers call these functions and shape the HTTP response.
 *
 * DESIGN DECISIONS:
 *
 * 1. OWNERSHIP ENFORCEMENT via { _id, userId } query:
 *    Every read/update/delete query includes BOTH the record _id AND
 *    the userId. This means a user can never access another user's
 *    reminders even if they guess the ObjectId.
 *    Pattern: findOne({ _id: id, userId }) → returns null if wrong user.
 *
 * 2. PARTIAL UPDATES with runValidators: true:
 *    findOneAndUpdate with { new: true, runValidators: true } ensures:
 *      - Returns the updated document (not the old one).
 *      - Re-runs Mongoose schema validators on the updated fields.
 *    We pass only the fields present in the request body to avoid
 *    overwriting existing fields with undefined.
 *
 * 3. TOGGLE ACTIVE vs full update:
 *    A dedicated toggleActive() function flips the isActive boolean.
 *    This is cleaner than a PUT that sends the full body just to toggle one field.
 *    The controller maps it to PATCH /:id/toggle.
 *
 * 4. FILTER by active status on list:
 *    getUserReminders accepts an optional `activeOnly` flag.
 *    Dashboard uses activeOnly=true; full history uses activeOnly=false.
 */

const { MedicineReminder } = require('../models');
const AppError              = require('../utils/AppError');

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────
/**
 * Creates a new medicine reminder for the authenticated user.
 *
 * @param {string} userId
 * @param {object} data   - Validated request body fields
 * @returns {Promise<MedicineReminder>}
 */
const createReminder = async (userId, data) => {
  const reminder = await MedicineReminder.create({
    userId,
    ...data
  });
  return reminder;
};

// ─────────────────────────────────────────────────────────────
// READ ALL
// ─────────────────────────────────────────────────────────────
/**
 * Returns all reminders for a user.
 *
 * @param {string}  userId
 * @param {boolean} activeOnly - If true, returns only active reminders
 * @returns {Promise<MedicineReminder[]>}
 */
const getUserReminders = async (userId, activeOnly = false) => {
  const filter = { userId };
  if (activeOnly) filter.isActive = true;

  return MedicineReminder.find(filter).sort({ createdAt: -1 });
};

// ─────────────────────────────────────────────────────────────
// READ ONE
// ─────────────────────────────────────────────────────────────
/**
 * Returns a single reminder, validating ownership.
 *
 * @param {string} userId
 * @param {string} reminderId
 * @returns {Promise<MedicineReminder>}
 * @throws  {AppError} 404
 */
const getReminderById = async (userId, reminderId) => {
  const reminder = await MedicineReminder.findOne({ _id: reminderId, userId });

  if (!reminder) {
    throw new AppError('Reminder not found or does not belong to your account.', 404);
  }

  return reminder;
};

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────
/**
 * Partially updates a reminder. Only fields present in `updates` are changed.
 *
 * @param {string} userId
 * @param {string} reminderId
 * @param {object} updates   - Validated fields to update
 * @returns {Promise<MedicineReminder>}
 * @throws  {AppError} 404
 */
const updateReminder = async (userId, reminderId, updates) => {
  const reminder = await MedicineReminder.findOneAndUpdate(
    { _id: reminderId, userId },       // Ownership check
    { $set: updates },                 // Only update provided fields
    { new: true, runValidators: true } // Return updated doc, re-run schema validators
  );

  if (!reminder) {
    throw new AppError('Reminder not found or does not belong to your account.', 404);
  }

  return reminder;
};

// ─────────────────────────────────────────────────────────────
// TOGGLE ACTIVE
// ─────────────────────────────────────────────────────────────
/**
 * Flips the isActive boolean on a reminder.
 * Used by PATCH /:id/toggle — more explicit than a full PUT.
 *
 * @param {string} userId
 * @param {string} reminderId
 * @returns {Promise<MedicineReminder>} - Updated reminder with new isActive value
 */
const toggleReminder = async (userId, reminderId) => {
  // First fetch to know current state, then flip
  const current = await getReminderById(userId, reminderId);

  current.isActive = !current.isActive;
  await current.save();

  return current;
};

// ─────────────────────────────────────────────────────────────
// COMPLETE REMINDER FOR TODAY
// ─────────────────────────────────────────────────────────────
const completeReminder = async (userId, reminderId, time) => {

  const reminder = await getReminderById(userId, reminderId);

  const today = new Date().toISOString().split("T")[0];

  const alreadyCompleted = reminder.completedLogs.some(
    log => log.date === today && log.time === time
  );

  if (!alreadyCompleted) {
    reminder.completedLogs.push({
      date: today,
      time
    });

    await reminder.save();
  }

  return reminder;
};

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────
/**
 * Permanently deletes a reminder. Validates ownership before deletion.
 *
 * @param {string} userId
 * @param {string} reminderId
 * @returns {Promise<void>}
 * @throws  {AppError} 404
 */
const deleteReminder = async (userId, reminderId) => {
  const reminder = await MedicineReminder.findOneAndDelete({ _id: reminderId, userId });

  if (!reminder) {
    throw new AppError('Reminder not found or does not belong to your account.', 404);
  }
};

module.exports = {
  createReminder,
  getUserReminders,
  getReminderById,
  updateReminder,
  toggleReminder,
  completeReminder,
  deleteReminder
};
