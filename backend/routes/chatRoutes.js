import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getConversations,
  getMessages,
  markAsRead,
  getUnreadCount,
} from '../controllers/chatController.js';

const router = Router();

/**
 * Chat REST Routes — complements the Socket.io real-time layer.
 *
 * GET  /api/chat/conversations          — list all conversations
 * GET  /api/chat/messages/:partnerId    — get chat history (paginated)
 * PUT  /api/chat/read/:partnerId        — mark messages from partner as read
 * GET  /api/chat/unread                 — get total unread count
 */
router.get('/conversations', protect, getConversations);
router.get('/messages/:partnerId', protect, getMessages);
router.put('/read/:partnerId', protect, markAsRead);
router.get('/unread', protect, getUnreadCount);

export default router;
