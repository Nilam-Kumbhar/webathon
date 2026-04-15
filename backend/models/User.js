import mongoose from 'mongoose';

/**
 * User Schema — core profile for the matrimonial platform.
 *
 * Design notes:
 * - `interests` is an array of strings for set-intersection matching.
 * - `verification` sub-doc tracks ID-proof upload and admin approval.
 * - `blockedUsers` is denormalized here for fast O(1) lookups during matching.
 * - `dailySuggestionsShown` tracks which users were already surfaced today
 *    so the recommendation engine never repeats within a calendar day.
 *
 * Indexes are declared at the bottom for query performance.
 */

const userSchema = new mongoose.Schema(
  {
    // ─── Auth ──────────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // never returned by default

    // ─── Demographics ──────────────────────────────────────
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    dateOfBirth: { type: Date, required: true },
    age: { type: Number }, // computed on save via pre-save hook

    // ─── Location ──────────────────────────────────────────
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },

    // ─── Profile ───────────────────────────────────────────
    education: { type: String, trim: true },
    occupation: { type: String, trim: true },
    bio: { type: String, maxlength: 500 },
    interests: [{ type: String, trim: true, lowercase: true }],
    profilePhoto: { type: String }, // URL

    // ─── Preferences (for matching) ────────────────────────
    preferredAgeMin: { type: Number, default: 18 },
    preferredAgeMax: { type: Number, default: 60 },
    preferredCity: { type: String, trim: true },
    preferredEducation: { type: String, trim: true },

    // ─── Verification ──────────────────────────────────────
    verification: {
      documentUrl: { type: String, default: null },
      status: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'rejected'],
        default: 'unverified',
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
    },

    // ─── Media ─────────────────────────────────────────────
    videoIntroUrl: { type: String, default: null },

    // ─── Safety ────────────────────────────────────────────
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ─── Recommendations ───────────────────────────────────
    dailySuggestionsShown: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dailySuggestionsDate: { type: Date }, // reset when the date changes

    // ─── Admin ─────────────────────────────────────────────
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Pre-save: compute age from DOB ──────────────────────
userSchema.pre('save', function (next) {
  if (this.dateOfBirth) {
    const today = new Date();
    const birth = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    this.age = age;
  }
  next();
});

// ─── Indexes ─────────────────────────────────────────────
// Speeds up matching queries that filter by gender, city, age
userSchema.index({ gender: 1, city: 1, age: 1 });
// Speeds up admin queries
userSchema.index({ role: 1 });
// Speeds up verification queue
userSchema.index({ 'verification.status': 1 });
// Speeds up ban checks
userSchema.index({ isBanned: 1 });

const User = mongoose.model('User', userSchema);
export default User;
