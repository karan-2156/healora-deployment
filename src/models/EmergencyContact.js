/**
 * EmergencyContact Model
 *
 * Stores a user's personal emergency contacts — people to call
 * in a medical emergency. These are displayed prominently on the dashboard.
 *
 * DESIGN DECISIONS:
 *
 * 1. isPrimary FLAG:
 *    - Allows the user to designate one contact as their primary emergency contact.
 *    - The dashboard can show this contact more prominently (e.g., at the top
 *      with a phone icon that triggers a tel: link).
 *    - We do NOT enforce uniqueness of isPrimary=true at the DB level here
 *      because Mongoose partial indexes for this are complex. Instead, the
 *      controller will handle "set old primary to false when a new primary is set".
 *    - IMPROVEMENT: Use a MongoDB partial unique index:
 *      { userId: 1, isPrimary: 1 } where isPrimary === true, for strict enforcement.
 *
 * 2. phone validation:
 *    - Basic E.164-compatible regex: allows +, digits, spaces, dashes.
 *    - We intentionally keep this loose to support international formats.
 *    - IMPROVEMENT: Use a library like `libphonenumber-js` for strict international
 *      phone validation in v2.
 *
 * 3. relationship is free-text (not enum):
 *    - Family structures and relationships are diverse globally.
 *    - An enum of [mother, father, spouse, friend, sibling...] would be
 *      restrictive and culturally limiting.
 *    - IMPROVEMENT: Provide a suggested list on the frontend as datalist/autocomplete.
 */

const mongoose = require('mongoose');

const EmergencyContactSchema = new mongoose.Schema(
  {
    // ── Ownership ─────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },

    // ── Contact Identity ──────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters']
    },

    // Free-text relationship description (e.g., "Mother", "Spouse", "Friend")
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters']
    },

    // ── Contact Methods ───────────────────────────────────────
    // Primary contact number — required
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [
        /^[+]?[\d\s\-().]{7,20}$/,
        'Please provide a valid phone number'
      ]
    },

    // Optional email address
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address'
      ],
      sparse: true // allows multiple null values (only validates non-null emails)
    },

    // ── Priority ──────────────────────────────────────────────
    // Marks this contact as the first person to call in an emergency
    isPrimary: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { versionKey: false }
  }
);

// ── Indexes ───────────────────────────────────────────────────
// Fetch all contacts for a user
EmergencyContactSchema.index(
  { userId: 1, createdAt: -1 },
  { name: 'idx_emergency_user_date' }
);

// Quick lookup of the primary contact
EmergencyContactSchema.index(
  { userId: 1, isPrimary: 1 },
  { name: 'idx_emergency_user_primary' }
);

module.exports = mongoose.model('EmergencyContact', EmergencyContactSchema);
