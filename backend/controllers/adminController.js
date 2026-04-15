import User from '../models/User.js';
import Report from '../models/Report.js';
import { detectFakeProfile } from '../utils/fakeDetection.js';

/**
 * Admin Controller
 *
 * GET    /api/admin/users         — get all users (paginated)
 * GET    /api/admin/reports       — view reports (handled by safetyController)
 * PUT    /api/admin/verify/:userId — verify user (handled by verificationController)
 * DELETE /api/admin/ban/:userId   — ban a user
 */

// ─── Get all users (paginated, filterable) ──────────────
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const verificationStatus = req.query.verification; // optional filter

    const filter = {};

    // Text search on name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by verification status
    if (verificationStatus) {
      filter['verification.status'] = verificationStatus;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Augment each user with fake-profile risk score
    const enriched = await Promise.all(
      users.map(async (user) => {
        const reportCount = await Report.countDocuments({ reportedUser: user._id });
        const fakeCheck = detectFakeProfile(user, reportCount);
        return { ...user, fakeProfileRisk: fakeCheck };
      })
    );

    return res.json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      total,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Ban a user ─────────────────────────────────────────
export const banUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot ban an admin' });
    }

    user.isBanned = true;
    await user.save();

    // Resolve all pending reports for this user
    await Report.updateMany(
      { reportedUser: userId, status: 'pending' },
      { status: 'resolved' }
    );

    return res.json({
      success: true,
      message: `User ${user.name} has been banned`,
    });
  } catch (error) {
    next(error);
  }
};
