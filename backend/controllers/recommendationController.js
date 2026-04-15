import User from '../models/User.js';
import MatchResult from '../models/MatchResult.js';
import { calculateMatchScore } from '../utils/matchingAlgorithm.js';

/**
 * Recommendation Controller
 *
 * GET /api/recommendations/top   — top matches sorted by score
 * GET /api/recommendations/daily — daily suggestions (no repeats within a day)
 */

// ─── Top Matches ────────────────────────────────────────
export const getTopRecommendations = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const limit = parseInt(req.query.limit) || 10;

    // Try to serve from cache first
    const cached = await MatchResult.find({ user: currentUser._id })
      .sort({ score: -1 })
      .limit(limit)
      .populate('matchedUser', 'name age city education profilePhoto interests')
      .lean();

    if (cached.length >= limit) {
      return res.json({
        success: true,
        source: 'cache',
        count: cached.length,
        data: cached.map((m) => ({
          user: m.matchedUser,
          score: m.score,
          breakdown: m.breakdown,
          explanation: m.explanation,
        })),
      });
    }

    // Cache miss — compute fresh matches
    const targetGender = currentUser.gender === 'male' ? 'female' : 'male';

    const candidates = await User.find({
      _id: { $ne: currentUser._id, $nin: currentUser.blockedUsers || [] },
      gender: targetGender,
      isBanned: false,
    })
      .select('name age city state country education interests profilePhoto dateOfBirth preferredAgeMin preferredAgeMax preferredEducation')
      .limit(100)
      .lean();

    const scored = candidates
      .map((c) => ({ candidate: c, ...calculateMatchScore(currentUser, c) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return res.json({
      success: true,
      source: 'computed',
      count: scored.length,
      data: scored.map((m) => ({
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

// ─── Daily Suggestions (no repeats) ─────────────────────
export const getDailySuggestions = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const limit = parseInt(req.query.limit) || 5;
    const today = new Date().toDateString();

    // Reset shown list if the date has changed
    if (
      !currentUser.dailySuggestionsDate ||
      new Date(currentUser.dailySuggestionsDate).toDateString() !== today
    ) {
      currentUser.dailySuggestionsShown = [];
      currentUser.dailySuggestionsDate = new Date();
    }

    const targetGender = currentUser.gender === 'male' ? 'female' : 'male';

    // Exclude: self, blocked, banned, and already-shown-today
    const excludeIds = [
      currentUser._id,
      ...(currentUser.blockedUsers || []),
      ...(currentUser.dailySuggestionsShown || []),
    ];

    const candidates = await User.find({
      _id: { $nin: excludeIds },
      gender: targetGender,
      isBanned: false,
    })
      .select('name age city state country education interests profilePhoto dateOfBirth preferredAgeMin preferredAgeMax preferredEducation')
      .limit(50)
      .lean();

    const scored = candidates
      .map((c) => ({ candidate: c, ...calculateMatchScore(currentUser, c) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Record that we showed these users today
    const shownIds = scored.map((m) => m.candidate._id);
    currentUser.dailySuggestionsShown.push(...shownIds);
    await currentUser.save();

    return res.json({
      success: true,
      count: scored.length,
      data: scored.map((m) => ({
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
