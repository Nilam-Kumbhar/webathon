import { findUsers, countUsers, findUserById, updateUser } from '../models/User.js';
import { countReportsByUser, resolveReportsByUser } from '../models/Report.js';
import { detectFakeProfile } from '../utils/fakeDetection.js';

/**
 * Admin Controller — user management & moderation tools.
 */

// ─── Get all users (paginated, filterable) ──────────────
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const verificationStatus = req.query.verification;

    const filter = {};
    if (search) filter.search = search;
    if (verificationStatus) filter.verification_status = verificationStatus;

    const users = findUsers(filter, {
      limit, offset: (page - 1) * limit, orderBy: 'createdAt DESC',
    });
    const total = countUsers(filter);

    const enriched = users.map((user) => {
      const reportCount = countReportsByUser(user._id);
      const fakeCheck = detectFakeProfile(user, reportCount);
      return { ...user, fakeProfileRisk: fakeCheck };
    });

    return res.json({
      success: true, page,
      totalPages: Math.ceil(total / limit),
      total, data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Ban a user ─────────────────────────────────────────
export const banUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = findUserById(Number(userId));
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot ban an admin' });
    }

    updateUser(user._id, { isBanned: true });
    resolveReportsByUser(user._id);

    return res.json({
      success: true,
      message: `User ${user.name} has been banned`,
    });
  } catch (error) {
    next(error);
  }
};
