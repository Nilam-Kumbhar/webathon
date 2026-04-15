import { Router } from 'express';
import { mockLogin } from '../controllers/authController.js';

const router = Router();

/**
 * Mock Auth Routes — temporary, for testing advanced features.
 *
 * POST /api/auth/login — get a JWT token
 */
router.post('/login', mockLogin);

export default router;
