import User from '../models/User.js';

/**
 * Media Controller
 *
 * POST /api/media/upload-video — upload a video intro (mock Cloudinary)
 * GET  /api/media/:userId      — get a user's media (video intro URL)
 */

// ─── Upload video intro (mock) ──────────────────────────
export const uploadVideo = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    // In production, this would be uploaded to Cloudinary / S3.
    // We mock it by saving locally and returning the path as a URL.
    const mockUrl = `/uploads/videos/${req.file.filename}`;

    currentUser.videoIntroUrl = mockUrl;
    await currentUser.save();

    return res.json({
      success: true,
      message: 'Video intro uploaded successfully',
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

    const user = await User.findById(userId)
      .select('name videoIntroUrl profilePhoto')
      .lean();

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
