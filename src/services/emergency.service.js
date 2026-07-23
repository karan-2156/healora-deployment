/**
 * Emergency Contact Service
 *
 * Business logic for managing emergency contacts.
 * Includes atomic primary contact management.
 *
 * DESIGN DECISIONS:
 *
 * 1. PRIMARY CONTACT LOGIC — Two-step update:
 *    When a contact is set as primary (isPrimary: true), we must:
 *      Step 1: Set ALL other contacts for this user to isPrimary: false
 *      Step 2: Set the target contact to isPrimary: true
 *
 *    We do this in two separate operations (not a transaction) for v1 simplicity.
 *    Risk: If Step 2 fails, all contacts have isPrimary: false (no primary set).
 *    This is a safe failure mode — the user can just set a new primary.
 *
 *    IMPROVEMENT: Wrap in a Mongoose session transaction for atomicity:
 *      const session = await mongoose.startSession();
 *      session.startTransaction();
 *      try {
 *        await EmergencyContact.updateMany(..., { session });
 *        await EmergencyContact.findOneAndUpdate(..., { session });
 *        await session.commitTransaction();
 *      } catch { await session.abortTransaction(); }
 *
 * 2. isPrimary IN BOTH create AND update:
 *    If a user creates a contact with isPrimary: true, we run the
 *    "clear other primaries" logic at creation time too (via _handlePrimaryFlag).
 *    This prevents duplicate primaries from being created.
 *
 * 3. SOFT DELETE: not used here.
 *    Emergency contacts don't need audit history. Hard delete is fine.
 *
 * 4. CONTACT LIMIT:
 *    No limit enforced here for v1. The UI can cap the count.
 *    IMPROVEMENT: Enforce max 10 contacts per user:
 *      const count = await EmergencyContact.countDocuments({ userId });
 *      if (count >= 10) throw new AppError('Maximum 10 emergency contacts allowed.', 400);
 */

const { EmergencyContact } = require('../models');
const AppError              = require('../utils/AppError');

// ─────────────────────────────────────────────────────────────
// Private: Handle Primary Contact Flag
// ─────────────────────────────────────────────────────────────
/**
 * If the new/updated contact should be primary, clear all others first.
 * This ensures only one contact per user has isPrimary: true.
 *
 * @param {string} userId
 * @param {string} excludeId - The contact being set as primary (don't clear it)
 */
const _clearOtherPrimaries = async (userId, excludeId) => {
  await EmergencyContact.updateMany(
    { userId, _id: { $ne: excludeId } }, // All contacts EXCEPT the one being set
    { $set: { isPrimary: false } }
  );
};

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────
/**
 * Creates a new emergency contact.
 * If isPrimary is true, clears the primary flag on all other contacts first.
 *
 * @param {string} userId
 * @param {object} data
 * @returns {Promise<EmergencyContact>}
 */
const addContact = async (userId, data) => {
  const contact = await EmergencyContact.create({ userId, ...data });

  // If this new contact is marked as primary, clear others
  if (contact.isPrimary) {
    await _clearOtherPrimaries(userId, contact._id);
  }

  return contact;
};

// ─────────────────────────────────────────────────────────────
// READ ALL
// ─────────────────────────────────────────────────────────────
/**
 * Returns all emergency contacts for a user.
 * Primary contact is shown first (sort isPrimary: -1 then name: 1).
 *
 * @param {string} userId
 * @returns {Promise<EmergencyContact[]>}
 */
const getUserContacts = async (userId) => {
  return EmergencyContact
    .find({ userId })
    .sort({ isPrimary: -1, createdAt: 1 }); // Primary first, then by creation order
};

// ─────────────────────────────────────────────────────────────
// READ ONE
// ─────────────────────────────────────────────────────────────
/**
 * @param {string} userId
 * @param {string} contactId
 * @returns {Promise<EmergencyContact>}
 * @throws  {AppError} 404
 */
const getContactById = async (userId, contactId) => {
  const contact = await EmergencyContact.findOne({ _id: contactId, userId });

  if (!contact) {
    throw new AppError('Emergency contact not found or does not belong to your account.', 404);
  }

  return contact;
};

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────
/**
 * Partially updates a contact.
 * If isPrimary is being set to true, clears others first.
 *
 * @param {string} userId
 * @param {string} contactId
 * @param {object} updates
 * @returns {Promise<EmergencyContact>}
 * @throws  {AppError} 404
 */
const updateContact = async (userId, contactId, updates) => {
  // Handle primary logic before saving
  if (updates.isPrimary === true) {
    await _clearOtherPrimaries(userId, contactId);
  }

  const contact = await EmergencyContact.findOneAndUpdate(
    { _id: contactId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!contact) {
    throw new AppError('Emergency contact not found or does not belong to your account.', 404);
  }

  return contact;
};

// ─────────────────────────────────────────────────────────────
// SET AS PRIMARY (dedicated action)
// ─────────────────────────────────────────────────────────────
/**
 * Sets a specific contact as the primary emergency contact.
 * All other contacts for this user have isPrimary set to false.
 *
 * @param {string} userId
 * @param {string} contactId
 * @returns {Promise<EmergencyContact>}
 */
const setPrimaryContact = async (userId, contactId) => {
  // Step 1: Verify contact exists and belongs to user
  await getContactById(userId, contactId);

  // Step 2: Clear all other primaries
  await _clearOtherPrimaries(userId, contactId);

  // Step 3: Set this contact as primary
  const contact = await EmergencyContact.findOneAndUpdate(
    { _id: contactId, userId },
    { $set: { isPrimary: true } },
    { new: true }
  );

  return contact;
};

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────
/**
 * @param {string} userId
 * @param {string} contactId
 * @returns {Promise<void>}
 * @throws  {AppError} 404
 */
const deleteContact = async (userId, contactId) => {
  const contact = await EmergencyContact.findOneAndDelete({ _id: contactId, userId });

  if (!contact) {
    throw new AppError('Emergency contact not found or does not belong to your account.', 404);
  }
};

module.exports = {
  addContact,
  getUserContacts,
  getContactById,
  updateContact,
  setPrimaryContact,
  deleteContact
};
