import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import {
  getTopRecommendations,
  getDailySuggestions,
} from '../controllers/recommendationController.js';

const router = Router();

/**
 * Recommendation Routes
 *
 * GET /api/recommendations/top   — top matches by score
 * GET /api/recommendations/daily — daily non-repeating suggestions
 */
router.get('/top', auth, getTopRecommendations);
router.get('/daily', auth, getDailySuggestions);

export default router;
