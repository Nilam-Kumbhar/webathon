import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import {
  reportUser,
  blockUser,
  getBlockedList,
} from '../controllers/safetyController.js';

const router = Router();

/**
 * Safety Routes
 *
 * POST /api/report     — report a user
 * POST /api/block      — block a user
 * GET  /api/block/list — list blocked users
 */
router.post('/report', auth, reportUser);
router.post('/block', auth, blockUser);
router.get('/block/list', auth, getBlockedList);

export default router;
