import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { adminOnly } from '../middleware/auth.js';
import { documentUpload } from '../config/upload.js';
import {
  uploadDocument,
  getVerificationStatus,
  adminVerifyUser,
} from '../controllers/verificationController.js';

const router = Router();

/**
 * Verification Routes
 *
 * POST /api/verification/upload       — upload ID document
 * GET  /api/verification/status       — check verification status
 * PUT  /api/admin/verify/:userId      — (mounted under /api/admin in server.js too)
 */
router.post('/upload', auth, documentUpload.single('document'), uploadDocument);
router.get('/status', auth, getVerificationStatus);

export default router;

// Also export the admin handler so it can be mounted on the admin router
export { adminVerifyUser };
