/**
 * Appointment Model
 *
 * A personal scheduler for the user's doctor appointments.
 * This is NOT integrated with any hospital or doctor booking system.
 * The user manually enters their appointment details for tracking purposes.
 *
 * DESIGN DECISIONS:
 *
 * 1. appointmentDate (Date) + appointmentTime (String) — stored separately:
 *
 *    Option A (chosen) — Separate date and time.
 *      Pros: Easy to query "all appointments this week" using date range on
 *            appointmentDate alone. Time is for display purposes.
 *      Cons: Requires combining them for precise sorting by exact timestamp.
 *
 *    Option B — Single `scheduledAt` DateTime.
 *      Pros: Precise, sortable, timezone-aware.
 *      Cons: Requires timezone handling from the frontend, which adds complexity
 *            for v1 when the user just wants to type "10:30 AM".
 *
 *    CHOSEN: Option A for v1 simplicity.
 *    IMPROVEMENT: Migrate to a single ISO datetime in v2 with timezone support.
 *
 * 2. status ENUM:
 *    - 'upcoming'  → default when created
 *    - 'completed' → user marks it done after the visit
 *    - 'cancelled' → user cancelled the appointment
 *    - Soft-state management. Appointments are never hard-deleted so history
 *      is preserved on the dashboard.
 *
 * 3. doctorName and specialty are free-text strings (not references):
 *    - No doctor database exists in this app (PRD scope).
 *    - IMPROVEMENT (v2): Add a `Doctor` collection and reference it here.
 */

const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    // ── Ownership ─────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },

    // ── Appointment Details ───────────────────────────────────
    doctorName: {
      type: String,
      required: [true, "Doctor's name is required"],
      trim: true,
      maxlength: [100, "Doctor's name cannot exceed 100 characters"]
    },

    specialty: {
      type: String,
      required: [true, 'Medical specialty is required'],
      trim: true,
      maxlength: [100, 'Specialty cannot exceed 100 characters']
      // e.g., "Cardiologist", "General Physician", "Dermatologist"
    },

    // ── Scheduling ────────────────────────────────────────────
    // The calendar date of the appointment (time component is ignored here)
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required']
    },

    // Stored as "HH:MM" string for display (e.g., "10:30", "14:00")
    appointmentTime: {
      type: String,
      required: [true, 'Appointment time is required'],
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Time must be in HH:MM format (e.g., "09:30")'
      ]
    },

    // ── Location ──────────────────────────────────────────────
    // Free text: clinic name, hospital name, or "Online / Video Call"
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
      default: ''
    },

    // ── Notes ─────────────────────────────────────────────────
    // User's personal notes: symptoms to discuss, questions to ask, etc.
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: ''
    },

    // ── Status ────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['upcoming', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid appointment status'
      },
      default: 'upcoming'
    }
  },
  {
    timestamps: true,
    toJSON: { versionKey: false }
  }
);

// ── Indexes ───────────────────────────────────────────────────
// Dashboard: all upcoming appointments for a user, sorted soonest first
AppointmentSchema.index(
  { userId: 1, appointmentDate: 1 },
  { name: 'idx_appt_user_date' }
);

// Filter by status (e.g., "show only upcoming")
AppointmentSchema.index(
  { userId: 1, status: 1 },
  { name: 'idx_appt_user_status' }
);

module.exports = mongoose.model('Appointment', AppointmentSchema);
