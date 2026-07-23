/**
 * MedicineReminder Model
 *
 * Tracks a user's medication schedule. Reminders are displayed
 * on the health dashboard. Push/email delivery is out of scope for v1.
 *
 * DESIGN DECISIONS:
 *
 * 1. times ARRAY (string, not Date):
 *    - Stored as "HH:MM" strings (e.g., ["08:00", "20:00"]) rather than
 *      Date objects because reminders are daily recurrences — the time
 *      of day is what matters, not a specific calendar date.
 *    - Storing as Date would require date arithmetic every day to check
 *      "is it time for this reminder?", which is unnecessary complexity for v1.
 *    - IMPROVEMENT (v2 — push notifications): Convert to Date with a scheduler
 *      like node-cron or AWS EventBridge when email/SMS delivery is added.
 *
 * 2. frequency ENUM:
 *    - Covers the most common medication schedules.
 *    - 'as_needed' is included for PRN (pro re nata) medications taken
 *      only when required (e.g., pain relievers, antihistamines).
 *    - IMPROVEMENT: Add a `customFrequency` string field for edge cases.
 *
 * 3. endDate:
 *    - Optional. When null, the reminder is indefinite (e.g., daily vitamins).
 *    - When set, the dashboard filters out expired reminders automatically.
 *
 * 4. isActive:
 *    - Soft disable: pause a reminder without deleting it.
 *    - Better UX than deleting — user can reactivate later.
 */

const mongoose = require('mongoose');

// Validates "HH:MM" format (00:00 – 23:59)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const MedicineReminderSchema = new mongoose.Schema(
  {
    // ── Ownership ─────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },

    // ── Medicine Details ──────────────────────────────────────
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      maxlength: [100, 'Medicine name cannot exceed 100 characters']
    },

    // Dosage as a descriptive string (e.g., "500mg", "1 tablet", "10ml")
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true,
      maxlength: [50, 'Dosage description cannot exceed 50 characters']
    },

    // ── Schedule ──────────────────────────────────────────────
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      enum: {
        values: ['once_daily', 'twice_daily', 'three_times_daily', 'weekly', 'as_needed'],
        message: '{VALUE} is not a valid frequency'
      }
    },

    // Array of "HH:MM" strings matching when to take the medicine each day
    // e.g. ["08:00", "14:00", "20:00"] for three_times_daily
    times: {
      type: [String],
      required: [true, 'At least one reminder time is required'],
      validate: [
        {
          validator: function (arr) {
            return arr.length > 0;
          },
          message: 'At least one time is required'
        },
        {
          validator: function (arr) {
            return arr.every((t) => timeRegex.test(t));
          },
          message: 'Each time must be in HH:MM format (e.g., "08:00")'
        }
      ]
    },

    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now
    },

    // Optional end date — null means the reminder runs indefinitely
    endDate: {
      type: Date,
      default: null
    },

    // ── Additional Info ───────────────────────────────────────
    // e.g., "Take with food", "Avoid sunlight after taking"
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
      default: ''
    },

    // ── Status ────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true
    
  },
  completedLogs: {
    type: [
        {
            date: String,
            time: String
        }
    ],
    default: []
}
  },
  {
    timestamps: true,
    toJSON: { versionKey: false }
  }
);


// ── Validation: endDate must be after startDate ───────────────
MedicineReminderSchema.pre('save', function (next) {
  if (this.endDate && this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

// ── Indexes ───────────────────────────────────────────────────
// Dashboard query: all active reminders for a user
MedicineReminderSchema.index(
  { userId: 1, isActive: 1 },
  { name: 'idx_reminder_user_active' }
);

// List all reminders for a user sorted by creation date
MedicineReminderSchema.index(
  { userId: 1, createdAt: -1 },
  { name: 'idx_reminder_user_date' }
);

module.exports = mongoose.model('MedicineReminder', MedicineReminderSchema);
