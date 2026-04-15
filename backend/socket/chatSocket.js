import jwt from 'jsonwebtoken';
import { findUserById } from '../models/User.js';
import {
  createMessage, findMessageByIdWithSender, markMessagesAsRead,
} from '../models/Message.js';
import { hasMutualInterest, getConversationKey } from '../utils/chatHelpers.js';

// Map of online users: userId → Set<socketId>
const onlineUsers = new Map();

/**
 * Authenticate socket connection via JWT.
 */
function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = findUserById(decoded.id);

    if (!user) return next(new Error('User not found'));
    if (user.isBanned) return next(new Error('Account is banned'));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
}

/**
 * Main socket handler.
 */
export function initChatSocket(io) {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 Socket connected: ${socket.user.name} (${userId})`);

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    socket.join(`user_${userId}`);
    io.emit('user_online', { userId });

    // ── Join a conversation room ────────────────────────
    socket.on('join_chat', ({ partnerId }) => {
      try {
        if (!partnerId) return;

        const mutual = hasMutualInterest(userId, partnerId);
        if (!mutual) {
          return socket.emit('error', { message: 'Mutual interest required to chat' });
        }

        const conversationKey = getConversationKey(userId, partnerId);
        socket.join(conversationKey);
        console.log(`💬 ${socket.user.name} joined room: ${conversationKey}`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // ── Send a message ──────────────────────────────────
    socket.on('send_message', ({ receiverId, text }) => {
      try {
        if (!receiverId || !text || !text.trim()) {
          return socket.emit('error', { message: 'receiverId and text are required' });
        }

        if (text.length > 2000) {
          return socket.emit('error', { message: 'Message too long (max 2000 chars)' });
        }

        const mutual = hasMutualInterest(userId, receiverId);
        if (!mutual) {
          return socket.emit('error', { message: 'You can only chat after mutual interest' });
        }

        const conversationKey = getConversationKey(userId, receiverId);
        const message = createMessage({
          conversationKey,
          sender: Number(userId),
          receiver: Number(receiverId),
          text: text.trim(),
        });

        const populated = findMessageByIdWithSender(message._id);
        io.to(conversationKey).emit('receive_message', populated);

        io.to(`user_${receiverId}`).emit('new_message_notification', {
          from: { _id: userId, name: socket.user.name },
          preview: text.trim().substring(0, 100),
          conversationKey, messageId: message._id,
        });
      } catch (err) {
        console.error('send_message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicators ───────────────────────────────
    socket.on('typing', ({ receiverId }) => {
      if (!receiverId) return;
      const conversationKey = getConversationKey(userId, receiverId);
      socket.to(conversationKey).emit('user_typing', { userId });
    });

    socket.on('stop_typing', ({ receiverId }) => {
      if (!receiverId) return;
      const conversationKey = getConversationKey(userId, receiverId);
      socket.to(conversationKey).emit('user_stop_typing', { userId });
    });
    //comments for understnading
    // ── Mark messages as read (real-time) ───────────────
    socket.on('mark_read', ({ partnerId }) => {
      try {
        if (!partnerId) return;
        const conversationKey = getConversationKey(userId, partnerId);
        markMessagesAsRead(conversationKey, Number(userId));
        io.to(conversationKey).emit('messages_read', { by: userId });
      } catch (err) {
        socket.emit('error', { message: 'Failed to mark as read' });
      }
    });

    // ── Get online status ───────────────────────────────
    socket.on('check_online', ({ targetUserId }) => {
      const isOnline = onlineUsers.has(targetUserId) && onlineUsers.get(targetUserId).size > 0;
      socket.emit('online_status', { userId: targetUserId, isOnline });
    });

    // ── Disconnect ──────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.user.name} (${userId})`);
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user_offline', { userId });
        }
      }
    });
  });

  console.log('💬 Chat socket initialized');
}
