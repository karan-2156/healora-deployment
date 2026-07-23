/**
 * HealthReading Model
 *
 * Stores health metric readings for the dashboard:
 * blood pressure, body weight, and blood sugar.
 *
 * ─────────────────────────────────────────────────────────────
 * DESIGN DECISION — Polymorphic Single Collection:
 *
 * Option A (chosen) — One collection, `type` discriminator, type-specific
 *   sub-object fields:
 *     { type: 'blood_pressure', bloodPressure: { systolic: 120, diastolic: 80 } }
 *     { type: 'weight',         weight:        { value: 70, unit: 'kg' } }
 *     { type: 'blood_sugar',    bloodSugar:    { value: 95, unit: 'mg/dL', mealContext: 'fasting' } }
 *
 *   Pros:
 *     - Single collection to query for the full dashboard ("all readings this week").
 *     - Easy to extend new metric types without schema migrations.
 *     - Mongoose sparse indexes handle empty sub-objects efficiently.
 *
 * Option B — Separate collections (BloodPressureReading, WeightReading, etc.)
 *   Pros: Strongly typed, no sparse fields.
 *   Cons: Every dashboard load requires 3 separate queries + client-side merge.
 *         Adding a new metric type requires a new collection + model file.
 *
 * CHOSEN: Option A. The sparse fields are minimal (each reading only has one
 * sub-object), and MongoDB handles this pattern well at the expected data scale.
 *
 * ─────────────────────────────────────────────────────────────
 * DESIGN DECISION — recordedAt vs. createdAt:
 *
 * `recordedAt` is WHEN the user actually measured the reading (could be in
 * the past, e.g., they forgot to log it and enter it the next day).
 * `createdAt` (from timestamps) is when the document was written to the DB.
 * Charts and trend analysis MUST use `recordedAt`, not `createdAt`.
 */

const mongoose = require('mongoose');

// ── Sub-schema: Blood Pressure ────────────────────────────────
const BloodPressureSchema = new mongoose.Schema(
  {
    // In mmHg. Normal: systolic < 120
    systolic: {
      type: Number,
      min: [50, 'Systolic pressure too low to be valid'],
      max: [300, 'Systolic pressure too high to be valid']
    },
    // In mmHg. Normal: diastolic < 80
    diastolic: {
      type: Number,
      min: [30, 'Diastolic pressure too low to be valid'],
      max: [200, 'Diastolic pressure too high to be valid']
    }
  },
  { _id: false }
);

// ── Sub-schema: Weight ────────────────────────────────────────
const WeightSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      min: [1, 'Weight must be greater than 0'],
      max: [700, 'Weight value seems unrealistic']
    },
    unit: {
      type: String,
      enum: {
        values: ['kg', 'lbs'],
        message: 'Weight unit must be kg or lbs'
      },
      default: 'kg'
    }
  },
  { _id: false }
);

// ── Sub-schema: Blood Sugar ───────────────────────────────────
const BloodSugarSchema = new mongoose.Schema(
  {
    // Glucose level value
    value: {
      type: Number,
      min: [1, 'Blood sugar value must be greater than 0'],
      max: [1500, 'Blood sugar value seems unrealistic']
    },
    unit: {
      type: String,
      enum: {
        values: ['mg/dL', 'mmol/L'],
        message: 'Blood sugar unit must be mg/dL or mmol/L'
      },
      default: 'mg/dL'
    },
    // Context matters for interpreting blood sugar levels
    mealContext: {
      type: String,
      enum: {
        values: ['fasting', 'post_meal', 'random', 'before_bed'],
        message: '{VALUE} is not a valid meal context'
      },
      default: 'random'
    }
  },
  { _id: false }
);

// ── Main Schema ───────────────────────────────────────────────
const HealthReadingSchema = new mongoose.Schema(
  {
    // ── Ownership ───────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },

    // ── Reading Type (discriminator) ────────────────────────
    type: {
      type: String,
      required: [true, 'Reading type is required'],
      enum: {
        values: ['blood_pressure', 'weight', 'blood_sugar'],
        message: '{VALUE} is not a valid reading type'
      }
    },

    // ── Type-Specific Data ──────────────────────────────────
    // Only one of these will be populated per document.
    // The others will be undefined (sparse). MongoDB handles this efficiently.
    bloodPressure: {
      type: BloodPressureSchema,
      default: undefined
    },

    weight: {
      type: WeightSchema,
      default: undefined
    },

    bloodSugar: {
      type: BloodSugarSchema,
      default: undefined
    },

    // ── Timestamp of Actual Measurement ────────────────────
    // When the reading was taken (user-provided), not when it was logged
    recordedAt: {
      type: Date,
      required: [true, 'Recording time is required'],
      default: Date.now
    },

    // Optional free-text notes for this reading
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { versionKey: false }
  }
);

// ── Cross-field Validation: ensure correct sub-object is present ──
HealthReadingSchema.pre('save', function (next) {
  const { type, bloodPressure, weight, bloodSugar } = this;

  if (type === 'blood_pressure') {
    if (!bloodPressure || bloodPressure.systolic == null || bloodPressure.diastolic == null) {
      return next(new Error('Blood pressure reading requires both systolic and diastolic values'));
    }
  }

  if (type === 'weight') {
    if (!weight || weight.value == null) {
      return next(new Error('Weight reading requires a value'));
    }
  }

  if (type === 'blood_sugar') {
    if (!bloodSugar || bloodSugar.value == null) {
      return next(new Error('Blood sugar reading requires a value'));
    }
  }

  next();
});

// ── Indexes ───────────────────────────────────────────────────
// Primary dashboard query: all readings of a given type for a user, sorted by time
HealthReadingSchema.index(
  { userId: 1, type: 1, recordedAt: -1 },
  { name: 'idx_reading_user_type_date' }
);

// Trend chart query: all readings for a user within a date range
HealthReadingSchema.index(
  { userId: 1, recordedAt: -1 },
  { name: 'idx_reading_user_date' }
);

module.exports = mongoose.model('HealthReading', HealthReadingSchema);
