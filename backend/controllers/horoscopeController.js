import { findUserById } from '../models/User.js';
import { calculateHoroscopeCompatibility } from '../utils/horoscope.js';

/**
 * Horoscope Controller — zodiac-based compatibility matching.
 */
export const matchHoroscope = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'targetUserId is required' });
    }
    if (currentUser._id.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false, message: 'Cannot match horoscope with yourself',
      });
    }

    const targetUser = await findUserById(Number(targetUserId));
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!currentUser.dateOfBirth || !targetUser.dateOfBirth) {
      return res.status(400).json({
        success: false, message: 'Both users must have date of birth set',
      });
    }

    const result = calculateHoroscopeCompatibility(currentUser.dateOfBirth, targetUser.dateOfBirth);

    return res.json({
      success: true,
      data: {
        you: { name: currentUser.name, sign: result.sign1, element: result.element1 },
        partner: { name: targetUser.name, sign: result.sign2, element: result.element2 },
        compatibilityScore: result.score, description: result.description,
      },
    });
  } catch (error) {
    next(error);
  }
};
