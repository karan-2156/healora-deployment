/**
 * User Model
 *
 * Central identity document. Every other collection references this via `userId`.
 *
 * DESIGN DECISIONS:
 *
 * 1. PASSWORD STORAGE:
 *    - `select: false` means the password field is NEVER returned in any query
 *      unless explicitly asked for with `.select('+password')`.
 *    - This prevents accidental password exposure in API responses.
 *    - Hashing itself is done in the auth controller using bcryptjs (Phase 3).
 *    - We store the hash here, NOT the plaintext.
 *
 * 2. OPTIONAL HEALTH FIELDS (dateOfBirth, gender, bloodGroup):
 *    - Not required at registration to keep onboarding friction low.
 *    - Once provided, they enable more accurate diet and symptom analysis
 *      prompts (e.g., Gemini can factor in age and blood group).
 *    - IMPROVEMENT: In v2, add a profile-completion nudge on the dashboard.
 *
 * 3. isActive (soft delete):
 *    - Instead of deleting a user document (which would orphan all related
 *      records), we set isActive = false. This preserves audit trails.
 *    - IMPROVEMENT: Add a scheduled job to hard-delete inactive accounts
 *      after 90 days for GDPR compliance.
 *
 * 4. toJSON transform:
 *    - Removes __v (Mongoose version key) and password from every serialized
 *      response automatically, so controllers never need to do it manually.
 */

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters']
    },

    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,          // Enforced by index below
      lowercase: true,       // Stored in lowercase to avoid case-sensitive duplicates
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address'
      ]
    },

    // ── Authentication ────────────────────────────────────────
    // select: false → never returned in queries unless explicitly requested
    password: {
    type: String,

    required: function () {
        return this.authProvider === "local";
    },

    minlength: [8, 'Password must be at least 8 characters'],
    select: false
},

googleId: {
    type: String,
    default: null
},

authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
},

avatar: {
    type: String,
    default: ''
},
// Contact Information
phone: {
  type: String,
  trim: true,
  default: '',
  match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit phone number']
},

// Physical Information
height: {
  type: Number,
  min: 30,
  max: 300,
  default: null
},

// Medical Information
allergies: {
  type: [String],
  default: []
},

chronicDiseases: {
  type: [String],
  default: []
},

currentMedications: {
  type: [String],
  default: []
},
    // ── Optional Health Profile ───────────────────────────────
    // These improve AI prompt context for diet and symptom analysis
    dateOfBirth: {
      type: Date,
      default: null
      // IMPROVEMENT: Add a virtual field `age` computed from dateOfBirth
    },

    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other', 'prefer_not_to_say'],
        message: '{VALUE} is not a valid gender option'
      },
      default: null
    },

    bloodGroup: {
      type: String,
      enum: {
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
        message: '{VALUE} is not a valid blood group'
      },
      default: null
    },

    // ── Password Reset (OTP) ───────────────────────────────────
// Used for Forgot Password flow
resetOtp: {
  type: String,
  default: null
},

resetOtpExpiry: {
  type: Date,
  default: null
},

resetOtpAttempts: {
  type: Number,
  default: 0
},

// ── Account Status ────────────────────────────────────────
// Soft delete: set false instead of removing the document
isActive: {
  type: Boolean,
  default: true
}
  },
  {
    // Automatically manages createdAt and updatedAt fields
    timestamps: true,

    // Transform applied every time .toJSON() or res.json() serializes this document
    toJSON: {
      transform(doc, ret) {
        delete ret.password; // Never expose password hash
        delete ret.__v;      // Remove Mongoose internal version key
        return ret;
      }
    }
  }
);

// ── Indexes ───────────────────────────────────────────────────
// email is already unique via the schema option, but declaring it explicitly
// here gives us control over the index name and makes it visible in db.explain().
UserSchema.index({ email: 1 }, { unique: true, name: 'idx_user_email' });

// ── Virtual: Age ──────────────────────────────────────────────
// Computed from dateOfBirth, not stored. Available on document objects.
// IMPROVEMENT: Expose this in the profile API response.
UserSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
});

module.exports = mongoose.model('User', UserSchema);
