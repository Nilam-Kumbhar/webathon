import User from '../models/User.js';
import MatchResult from '../models/MatchResult.js';
import { calculateMatchScore } from '../utils/matchingAlgorithm.js';

/**
 * Match Controller
 *
 * POST /api/match/calculate/:userId  — score current user against a specific user
 * GET  /api/match/recommendations    — compute & return top matches for current user
 */

// ─── Calculate match against a specific user ────────────
export const calculateMatch = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;

    if (currentUser._id.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: 'Cannot match with yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { score, breakdown, explanation } = calculateMatchScore(currentUser, targetUser);

    // Upsert cached result so we don't recalculate on next request
    await MatchResult.findOneAndUpdate(
      { user: currentUser._id, matchedUser: targetUser._id },
      {
        score,
        breakdown,
        explanation,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      data: {
        matchedUser: {
          _id: targetUser._id,
          name: targetUser.name,
          age: targetUser.age,
          city: targetUser.city,
          education: targetUser.education,
          profilePhoto: targetUser.profilePhoto,
        },
        score,
        breakdown,
        explanation,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Generate recommendations for the current user ──────
export const getRecommendations = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const limit = parseInt(req.query.limit) || 20;

    // Determine opposite gender for heterosexual matching (configurable later)
    const targetGender = currentUser.gender === 'male' ? 'female' : 'male';

    // Fetch candidates: opposite gender, not banned, not blocked, not self
    const candidates = await User.find({
      _id: { $ne: currentUser._id, $nin: currentUser.blockedUsers || [] },
      gender: targetGender,
      isBanned: false,
    })
      .select('name age city state country education interests profilePhoto dateOfBirth preferredAgeMin preferredAgeMax preferredEducation')
      .limit(100) // cap to prevent expensive full-collection scans
      .lean();

    // Score every candidate
    const scored = candidates.map((candidate) => {
      const { score, breakdown, explanation } = calculateMatchScore(currentUser, candidate);
      return { candidate, score, breakdown, explanation };
    });

    // Sort descending by score and take top N
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    // Bulk-upsert into cache (fire-and-forget for speed)
    const bulkOps = top.map((m) => ({
      updateOne: {
        filter: { user: currentUser._id, matchedUser: m.candidate._id },
        update: {
          score: m.score,
          breakdown: m.breakdown,
          explanation: m.explanation,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        upsert: true,
      },
    }));
    if (bulkOps.length > 0) {
      MatchResult.bulkWrite(bulkOps).catch((e) => console.error('Cache write error:', e));
    }

    return res.json({
      success: true,
      count: top.length,
      data: top.map((m) => ({
        user: m.candidate,
        score: m.score,
        breakdown: m.breakdown,
        explanation: m.explanation,
      })),
    });
  } catch (error) {
    next(error);
  }
};
