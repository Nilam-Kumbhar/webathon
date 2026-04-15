import { Router } from 'express';
import { auth, adminOnly } from '../middleware/auth.js';
import { getAllUsers, banUser } from '../controllers/adminController.js';
import { getReports } from '../controllers/safetyController.js';
import { adminVerifyUser } from '../controllers/verificationController.js';

const router = Router();

/**
 * Admin Routes — all require auth + admin role
 *
 * GET    /api/admin/users          — list all users (paginated)
 * GET    /api/admin/reports        — view reports (paginated, filterable)
 * PUT    /api/admin/verify/:userId — approve/reject verification
 * DELETE /api/admin/ban/:userId    — ban a user
 */
router.get('/users', auth, adminOnly, getAllUsers);
router.get('/reports', auth, adminOnly, getReports);
router.put('/verify/:userId', auth, adminOnly, adminVerifyUser);
router.delete('/ban/:userId', auth, adminOnly, banUser);

export default router;
