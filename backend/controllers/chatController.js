import Message from '../models/Message.js';
import { hasMutualInterest, getConversationKey } from '../utils/chatHelpers.js';

/**
 * Chat Controller — REST endpoints for chat history and management.
 *
 * Real-time messaging is handled via Socket.io (see socket/chatSocket.js).
 * These REST endpoints cover:
 *
 * GET  /api/chat/conversations         — list all conversations for the user
 * GET  /api/chat/messages/:partnerId   — get message history with a partner
 * PUT  /api/chat/read/:partnerId       — mark messages as read
 * GET  /api/chat/unread                — get total unread message count
 */

// ─── List all conversations ─────────────────────────────
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Aggregate to get the latest message per conversation
    const conversations = await Message.aggregate([
      // Find all messages involving this user
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      // Sort newest first so $first in the group gives us the latest message
      { $sort: { createdAt: -1 } },
      // Group by conversation
      {
        $group: {
          _id: '$conversationKey',
          lastMessage: { $first: '$text' },
          lastMessageAt: { $first: '$createdAt' },
          lastSender: { $first: '$sender' },
          // Determine the partner ID
          partnerId: {
            $first: {
              $cond: [{ $eq: ['$sender', userId] }, '$receiver', '$sender'],
            },
          },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', userId] },
                    { $eq: ['$readAt', null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      // Sort by most recent conversation first
      { $sort: { lastMessageAt: -1 } },
      // Populate partner info
      {
        $lookup: {
          from: 'users',
          localField: 'partnerId',
          foreignField: '_id',
          as: 'partner',
          pipeline: [
            { $project: { name: 1, profilePhoto: 1, profilePic: 1, city: 1 } },
          ],
        },
      },
      { $unwind: '$partner' },
    ]);

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

    // Verify mutual interest before showing messages
    const mutual = await hasMutualInterest(userId, partnerId);
    if (!mutual) {
      return res.status(403).json({
        success: false,
        message: 'Chat is only available after mutual interest',
      });
    }

    const conversationKey = getConversationKey(userId, partnerId);

    const [messages, total] = await Promise.all([
      Message.find({ conversationKey })
        .sort({ createdAt: -1 }) // newest first for pagination
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sender', 'name profilePhoto profilePic')
        .lean(),
      Message.countDocuments({ conversationKey }),
    ]);

    // Return in chronological order (oldest first for chat UI)
    messages.reverse();

    return res.json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      total,
      data: messages,
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

    const result = await Message.updateMany(
      { conversationKey, receiver: userId, readAt: null },
      { readAt: new Date() }
    );

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
    const count = await Message.countDocuments({
      receiver: req.user._id,
      readAt: null,
    });

    return res.json({ success: true, unreadCount: count });
  } catch (error) {
    next(error);
  }
};
