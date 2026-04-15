import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { calculateMatch, getRecommendations } from '../controllers/matchController.js';

const router = Router();

/**
 * Match Routes
 *
 * POST /api/match/calculate/:userId  — score against a specific user
 * GET  /api/match/recommendations    — compute top matches
 */
router.post('/calculate/:userId', auth, calculateMatch);
router.get('/recommendations', auth, getRecommendations);

export default router;
