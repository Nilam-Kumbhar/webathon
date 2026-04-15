import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { videoUpload } from '../config/upload.js';
import { uploadVideo, getUserMedia } from '../controllers/mediaController.js';

const router = Router();

/**
 * Media Routes
 *
 * POST /api/media/upload-video — upload video intro
 * GET  /api/media/:userId      — get user's media
 */
router.post('/upload-video', auth, videoUpload.single('video'), uploadVideo);
router.get('/:userId', auth, getUserMedia);

export default router;
