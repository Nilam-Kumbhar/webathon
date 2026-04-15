import { findUserById, findUsers } from '../models/User.js';
import { upsertMatchResult, bulkUpsertMatchResults } from '../models/MatchResult.js';
import { calculateMatchScore } from '../utils/matchingAlgorithm.js';

/**
 * Match Controller — calculate match score & generate recommendations.
 */

// ─── Calculate match against a specific user ────────────
export const calculateMatch = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;

    if (currentUser._id.toString() === targetUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot match with yourself' });
    }

    const targetUser = await findUserById(Number(targetUserId));
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { score, breakdown, explanation } = calculateMatchScore(currentUser, targetUser);

    await upsertMatchResult({
      userId: currentUser._id,
      matchedUserId: targetUser._id,
      score, breakdown, explanation,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return res.json({
      success: true,
      data: {
        matchedUser: {
          _id: targetUser._id,
          name: targetUser.name, age: targetUser.age, city: targetUser.city,
          education: targetUser.education, profilePhoto: targetUser.profilePhoto,
        },
        score, breakdown, explanation,
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

    const targetGender = currentUser.gender === 'male' ? 'female' : 'male';
    const candidates = await findUsers(
      {
        gender: targetGender, isBanned: false,
        excludeIds: [currentUser._id, ...(currentUser.blockedUsers || [])],
      },
      { limit: 100 }
    );

    const scored = candidates.map((candidate) => {
      const { score, breakdown, explanation } = calculateMatchScore(currentUser, candidate);
      return { candidate, score, breakdown, explanation };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    // Bulk-upsert into cache
    if (top.length > 0) {
      try {
        await bulkUpsertMatchResults(top.map(m => ({
          userId: currentUser._id, matchedUserId: m.candidate._id,
          score: m.score, breakdown: m.breakdown, explanation: m.explanation,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })));
      } catch (e) { console.error('Cache write error:', e); }
    }

    return res.json({
      success: true, count: top.length,
      data: top.map((m) => ({
        user: m.candidate, score: m.score,
        breakdown: m.breakdown, explanation: m.explanation,
      })),
    });
  } catch (error) {
    next(error);
  }
};
