import { findUserById, updateUser } from '../models/User.js';
import {
  createReport, countReportsByUser, findReportsPopulated, countReports,
} from '../models/Report.js';
import { detectFakeProfile } from '../utils/fakeDetection.js';

/**
 * Safety Controller — reporting, blocking, and moderation.
 */

// ─── Report a user ──────────────────────────────────────
export const reportUser = async (req, res, next) => {
  try {
    const { reportedUserId, reason, description } = req.body;
    const reporter = req.user;

    if (!reportedUserId || !reason) {
      return res.status(400).json({
        success: false, message: 'reportedUserId and reason are required',
      });
    }
    if (reporter._id.toString() === reportedUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot report yourself' });
    }

    const targetUser = findUserById(Number(reportedUserId));
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Reported user not found' });
    }

    const report = createReport({
      reportedBy: reporter._id,
      reportedUser: Number(reportedUserId),
      reason, description,
    });

    const reportCount = countReportsByUser(Number(reportedUserId));
    const fakeCheck = detectFakeProfile(targetUser, reportCount);

    return res.status(201).json({
      success: true, message: 'Report submitted',
      data: { reportId: report._id, fakeProfileAnalysis: fakeCheck },
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false, message: 'You have already reported this user',
      });
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
    if (currentUser._id.toString() === blockedUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    }

    const target = findUserById(Number(blockedUserId));
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Re-fetch to get latest blockedUsers
    const freshUser = findUserById(currentUser._id);
    const blocked = freshUser.blockedUsers || [];
    const numId = Number(blockedUserId);
    if (!blocked.includes(numId)) {
      blocked.push(numId);
      updateUser(currentUser._id, { blockedUsers: blocked });
    }

    return res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── List blocked users ─────────────────────────────────
export const getBlockedList = async (req, res, next) => {
  try {
    const user = findUserById(req.user._id);
    const blockedIds = user.blockedUsers || [];
    const blockedUsers = blockedIds.map((id) => {
      const u = findUserById(id);
      return u ? { _id: u._id, id: u._id, name: u.name, profilePhoto: u.profilePhoto } : null;
    }).filter(Boolean);

    return res.json({ success: true, count: blockedUsers.length, data: blockedUsers });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: get all reports ─────────────────────────────
export const getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const statusFilter = req.query.status;

    const filter = {};
    if (statusFilter) filter.status = statusFilter;

    const reports = findReportsPopulated(filter, { limit, offset: (page - 1) * limit });
    const total = countReports(filter);

    return res.json({
      success: true, page,
      totalPages: Math.ceil(total / limit),
      total, data: reports,
    });
  } catch (error) {
    next(error);
  }
};
