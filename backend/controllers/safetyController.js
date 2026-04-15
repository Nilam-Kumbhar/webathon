import User from '../models/User.js';
import Report from '../models/Report.js';
import { detectFakeProfile } from '../utils/fakeDetection.js';

/**
 * Safety Controller
 *
 * POST /api/report       — report a user
 * POST /api/block        — block a user
 * GET  /api/block/list   — list blocked users
 * GET  /api/admin/reports — admin view all reports
 */

// ─── Report a user ──────────────────────────────────────
export const reportUser = async (req, res, next) => {
  try {
    const { reportedUserId, reason, description } = req.body;
    const reporter = req.user;

    if (!reportedUserId || !reason) {
      return res
        .status(400)
        .json({ success: false, message: 'reportedUserId and reason are required' });
    }

    if (reporter._id.toString() === reportedUserId) {
      return res.status(400).json({ success: false, message: 'Cannot report yourself' });
    }

    // Check if target exists
    const targetUser = await User.findById(reportedUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Reported user not found' });
    }

    // Create report (unique index prevents duplicate reports)
    const report = await Report.create({
      reportedBy: reporter._id,
      reportedUser: reportedUserId,
      reason,
      description,
    });

    // Run fake-profile heuristic in the background
    const reportCount = await Report.countDocuments({ reportedUser: reportedUserId });
    const fakeCheck = detectFakeProfile(targetUser, reportCount);

    return res.status(201).json({
      success: true,
      message: 'Report submitted',
      data: {
        reportId: report._id,
        fakeProfileAnalysis: fakeCheck, // useful info for admin review
      },
    });
  } catch (error) {
    // Duplicate report → unique index violation
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reported this user' });
    }
    next(error);
  }
};

// ─── Block a user ───────────────────────────────────────
export const blockUser = async (req, res, next) => {
  try {
    const { blockedUserId } = req.body;
    const currentUser = req.user;

    if (!blockedUserId) {
      return res.status(400).json({ success: false, message: 'blockedUserId is required' });
    }

    if (currentUser._id.toString() === blockedUserId) {
      return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    }

    // Verify target exists
    const target = await User.findById(blockedUserId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Add to blocked list (use $addToSet to prevent duplicates)
    await User.findByIdAndUpdate(currentUser._id, {
      $addToSet: { blockedUsers: blockedUserId },
    });

    return res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── List blocked users ─────────────────────────────────
export const getBlockedList = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'name profilePhoto')
      .lean();

    return res.json({
      success: true,
      count: user.blockedUsers.length,
      data: user.blockedUsers,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: get all reports ─────────────────────────────
export const getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const statusFilter = req.query.status; // optional: 'pending', 'reviewed', etc.

    const filter = {};
    if (statusFilter) filter.status = statusFilter;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reportedBy', 'name email')
        .populate('reportedUser', 'name email profilePhoto')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      total,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};
