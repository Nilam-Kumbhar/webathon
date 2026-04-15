import mongoose from 'mongoose';

/**
 * MatchResult Schema — caches computed match scores between two users.
 *
 * Caching avoids recalculating the same pair repeatedly. The TTL index
 * (`expiresAt`) auto-purges stale results after 24 hours so scores stay
 * fresh as profiles are updated.
 */

const matchResultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    matchedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    breakdown: {
      ageScore: { type: Number },
      locationScore: { type: Number },
      interestsScore: { type: Number },
      educationScore: { type: Number },
    },
    explanation: { type: String }, // "why this match" text
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

// Fast lookup of a user's cached matches, sorted by score
matchResultSchema.index({ user: 1, score: -1 });
// Prevent duplicate pair entries
matchResultSchema.index({ user: 1, matchedUser: 1 }, { unique: true });
// TTL index — MongoDB will auto-delete documents after `expiresAt`
matchResultSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MatchResult = mongoose.model('MatchResult', matchResultSchema);
export default MatchResult;
