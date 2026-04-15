import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { matchHoroscope } from '../controllers/horoscopeController.js';

const router = Router();

/**
 * Horoscope Routes
 *
 * POST /api/horoscope/match — zodiac compatibility between two users
 */
router.post('/match', auth, matchHoroscope);

export default router;
