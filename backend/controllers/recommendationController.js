import { findUserById, findUsers, updateUser } from '../models/User.js';
import { findMatchResultsWithUser } from '../models/MatchResult.js';
import { calculateMatchScore } from '../utils/matchingAlgorithm.js';

/**
 * Recommendation Controller — top matches & daily suggestions.
 */

// ─── Top Matches ────────────────────────────────────────
export const getTopRecommendations = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const limit = parseInt(req.query.limit) || 10;

    // Try cache first
    const cached = findMatchResultsWithUser(currentUser._id, { limit });
    if (cached.length >= limit) {
      return res.json({
        success: true, source: 'cache', count: cached.length,
        data: cached.map((m) => ({
          user: m.matchedUser, score: m.score,
          breakdown: m.breakdown, explanation: m.explanation,
        })),
      });
    }

    // Cache miss — compute fresh
    const targetGender = currentUser.gender === 'male' ? 'female' : 'male';
    const candidates = findUsers(
      {
        gender: targetGender, isBanned: false,
        excludeIds: [currentUser._id, ...(currentUser.blockedUsers || [])],
      },
      { limit: 100 }
    );

    const scored = candidates
      .map((c) => ({ candidate: c, ...calculateMatchScore(currentUser, c) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return res.json({
      success: true, source: 'computed', count: scored.length,
      data: scored.map((m) => ({
        user: m.candidate, score: m.score,
        breakdown: m.breakdown, explanation: m.explanation,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Daily Suggestions (no repeats) ─────────────────────
export const getDailySuggestions = async (req, res, next) => {
  try {
    let currentUser = findUserById(req.user._id);
    const limit = parseInt(req.query.limit) || 5;
    const today = new Date().toDateString();

    // Reset shown list if the date has changed
    let dailySuggestionsShown = currentUser.dailySuggestionsShown || [];
    if (
      !currentUser.dailySuggestionsDate ||
      new Date(currentUser.dailySuggestionsDate).toDateString() !== today
    ) {
      dailySuggestionsShown = [];
      updateUser(currentUser._id, {
        dailySuggestionsShown: [],
        dailySuggestionsDate: new Date().toISOString(),
      });
      currentUser = findUserById(currentUser._id);
    }

    const targetGender = currentUser.gender === 'male' ? 'female' : 'male';
    const excludeIds = [
      currentUser._id,
      ...(currentUser.blockedUsers || []),
      ...dailySuggestionsShown,
    ];
    const candidates = findUsers(
      { gender: targetGender, isBanned: false, excludeIds },
      { limit: 50 }
    );

    const scored = candidates
      .map((c) => ({ candidate: c, ...calculateMatchScore(currentUser, c) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Record shown users
    const shownIds = scored.map((m) => m.candidate._id);
    const updatedShown = [...dailySuggestionsShown, ...shownIds];
    updateUser(currentUser._id, { dailySuggestionsShown: updatedShown });

    return res.json({
      success: true, count: scored.length,
      data: scored.map((m) => ({
        user: m.candidate, score: m.score,
        breakdown: m.breakdown, explanation: m.explanation,
      })),
    });
  } catch (error) {
    next(error);
  }
};
