import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  sendInterest,
  respondToInterest,
  getReceivedInterests,
  getSentInterests,
  getMutualMatches,
} from '../controllers/interestController.js';

const router = Router();

/**
 * Interest Routes
 *
 * POST /api/interest/send       — send interest to a user
 * PUT  /api/interest/respond    — accept or reject a received interest
 * GET  /api/interest/received   — list pending interests received
 * GET  /api/interest/sent       — list interests you've sent
 * GET  /api/interest/matches    — list all mutual matches
 */
router.post('/send', protect, sendInterest);
router.put('/respond', protect, respondToInterest);
router.get('/received', protect, getReceivedInterests);
router.get('/sent', protect, getSentInterests);
router.get('/matches', protect, getMutualMatches);

export default router;
