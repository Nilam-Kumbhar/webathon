import { findUserById, updateUser } from '../models/User.js';

/**
 * Media Controller — video intro upload and user media retrieval.
 */

// ─── Upload video intro (mock) ──────────────────────────
export const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    const mockUrl = `/uploads/videos/${req.file.filename}`;
    updateUser(req.user._id, { videoIntroUrl: mockUrl });

    return res.json({
      success: true, message: 'Video intro uploaded successfully',
      data: { videoUrl: mockUrl },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get user media ─────────────────────────────────────
export const getUserMedia = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = findUserById(Number(userId));

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        name: user.name,
        videoIntroUrl: user.videoIntroUrl,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    next(error);
  }
};
