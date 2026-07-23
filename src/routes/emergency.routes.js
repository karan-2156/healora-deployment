/**
 * Emergency Contact Routes
 * Base path: /api/emergency  (mounted in app.js)
 *
 * ROUTE MAP:
 *   GET    /api/emergency              → List all contacts (primary contact first)
 *   POST   /api/emergency              → Add a new contact
 *   GET    /api/emergency/:id          → Get single contact
 *   PUT    /api/emergency/:id          → Update contact (partial)
 *   DELETE /api/emergency/:id          → Delete contact
 *   PATCH  /api/emergency/:id/primary  → Set as primary emergency contact
 *
 * MIDDLEWARE CHAIN:
 *   All routes:        protect
 *   :id routes:        validateObjectId
 *   POST:              createContactValidation
 *   PUT:               updateContactValidation
 *   PATCH /:id/primary: no body validation (no body required)
 */

const express              = require('express');
const EmergencyController  = require('../controllers/emergency.controller');
const { protect }          = require('../middleware/auth.middleware');
const validateObjectId     = require('../middleware/validateObjectId.middleware');
const {
  createContactValidation,
  updateContactValidation
}                           = require('../validators/emergency.validator');

const router = express.Router();

router.use(protect);

// ── Collection routes ──────────────────────────────────────────

router.get(
  '/nearby-hospitals',
  EmergencyController.getNearbyHospitals
);

router.get(
  '/',
  EmergencyController.getContacts
);

router.post(
  '/',
  ...createContactValidation,
  EmergencyController.addContact
);

// ── Document routes ────────────────────────────────────────────
router.get(
  '/:id',
  validateObjectId('id'),
  EmergencyController.getContactById
);

router.put(
  '/:id',
  validateObjectId('id'),
  ...updateContactValidation,
  EmergencyController.updateContact
);

router.delete(
  '/:id',
  validateObjectId('id'),
  EmergencyController.deleteContact
);

// ── Primary contact action ─────────────────────────────────────
// No body needed — the contact to set as primary is identified by :id
router.patch(
  '/:id/primary',
  validateObjectId('id'),
  EmergencyController.setPrimary
);

module.exports = router;
