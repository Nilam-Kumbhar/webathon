import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

/**
 * Verification Controller
 *
 * POST /api/verification/upload   — upload ID document (mock cloud storage)
 * GET  /api/verification/status   — check current verification status
 * PUT  /api/admin/verify/:userId  — admin approves/rejects verification
 */

// ─── Upload ID document (mock) ──────────────────────────
export const uploadDocument = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (currentUser.verification.status === 'verified') {
      return res.status(400).json({ success: false, message: 'Already verified' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // In production this would go to S3/Cloudinary.
    // We mock it by saving to /uploads and generating a URL.
    const mockUrl = `/uploads/verification/${req.file.filename}`;

    currentUser.verification.documentUrl = mockUrl;
    currentUser.verification.status = 'pending';
    await currentUser.save();

    return res.json({
      success: true,
      message: 'Document uploaded — pending admin review',
      data: {
        documentUrl: mockUrl,
        status: 'pending',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Check verification status ──────────────────────────
export const getVerificationStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('verification').lean();

    return res.json({
      success: true,
      data: user.verification,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: approve or reject ───────────────────────────
export const adminVerifyUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: 'action must be "approve" or "reject"' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.verification.status = action === 'approve' ? 'verified' : 'rejected';
    user.verification.reviewedBy = req.user._id;
    user.verification.reviewedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      message: `User ${action === 'approve' ? 'verified' : 'rejected'} successfully`,
      data: user.verification,
    });
  } catch (error) {
    next(error);
  }
};
