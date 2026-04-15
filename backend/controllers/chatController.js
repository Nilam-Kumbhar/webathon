import {
  getConversationsList, findMessagesWithSender,
  markMessagesAsRead, countMessages, countUnreadMessages,
} from '../models/Message.js';
import { hasMutualInterest, getConversationKey } from '../utils/chatHelpers.js';

/**
 * Chat Controller — REST endpoints for chat history and management.
 */

// ─── List all conversations ─────────────────────────────
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversations = await getConversationsList(userId);
    return res.json({ success: true, count: conversations.length, data: conversations });
  } catch (error) {
    next(error);
  }
};

// ─── Get message history with a partner ─────────────────
export const getMessages = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { partnerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const mutual = await hasMutualInterest(userId, partnerId);
    if (!mutual) {
      return res.status(403).json({
        success: false, message: 'Chat is only available after mutual interest',
      });
    }

    const conversationKey = getConversationKey(userId, partnerId);
    const offset = (page - 1) * limit;

    const messages = await findMessagesWithSender(conversationKey, { limit, offset });
    const total = await countMessages({ conversationKey });

    // Return in chronological order (oldest first for chat UI)
    messages.reverse();

    return res.json({
      success: true, page,
      totalPages: Math.ceil(total / limit),
      total, data: messages,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Mark messages as read ──────────────────────────────
export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { partnerId } = req.params;
    const conversationKey = getConversationKey(userId, partnerId);

    const result = await markMessagesAsRead(conversationKey, userId);
    return res.json({
      success: true,
      message: `${result.modifiedCount} messages marked as read`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get unread message count ───────────────────────────
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await countUnreadMessages(req.user._id);
    return res.json({ success: true, unreadCount: count });
  } catch (error) {
    next(error);
  }
};
