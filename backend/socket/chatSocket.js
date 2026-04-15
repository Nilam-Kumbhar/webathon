import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { hasMutualInterest, getConversationKey } from '../utils/chatHelpers.js';

/**
 * Socket.io Chat Handler
 *
 * Handles real-time text messaging between mutually interested users.
 *
 * ─── Client Events (incoming) ────────────────────────────
 *   'send_message'   → { receiverId, text }
 *   'typing'         → { receiverId }
 *   'stop_typing'    → { receiverId }
 *   'mark_read'      → { partnerId }
 *   'join_chat'      → { partnerId }     // join conversation room
 *
 * ─── Server Events (outgoing) ────────────────────────────
 *   'receive_message' → full message object
 *   'user_typing'     → { userId }
 *   'user_stop_typing'→ { userId }
 *   'messages_read'   → { by: userId }
 *   'error'           → { message }
 *
 * ─── Authentication ──────────────────────────────────────
 *   JWT token must be sent as `socket.handshake.auth.token`
 *   or as query param `?token=...`.
 *   The middleware verifies it before allowing the connection.
 *
 * ─── Room Strategy ───────────────────────────────────────
 *   Each user auto-joins a personal room named `user_<userId>`.
 *   When two users open a chat, both join a conversation room
 *   named by the deterministic conversationKey.
 */

// Map of online users: userId → Set<socketId> (one user can have multiple tabs)
const onlineUsers = new Map();

/**
 * Authenticate socket connection via JWT.
 */
async function authenticateSocket(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('name profilePhoto profilePic isBanned');

    if (!user) return next(new Error('User not found'));
    if (user.isBanned) return next(new Error('Account is banned'));

    socket.user = user; // attach user to socket
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
}

/**
 * Main socket handler — call this once from server.js with the io instance.
 */
export function initChatSocket(io) {
  // Apply auth middleware to all incoming connections
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 Socket connected: ${socket.user.name} (${userId})`);

    // ── Track online status ─────────────────────────────
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal room for direct messages
    socket.join(`user_${userId}`);

    // Broadcast online status
    io.emit('user_online', { userId });

    // ── Join a conversation room ────────────────────────
    socket.on('join_chat', async ({ partnerId }) => {
      try {
        if (!partnerId) return;

        const mutual = await hasMutualInterest(userId, partnerId);
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
    socket.on('send_message', async ({ receiverId, text }) => {
      try {
        // Validate input
        if (!receiverId || !text || !text.trim()) {
          return socket.emit('error', { message: 'receiverId and text are required' });
        }

        if (text.length > 2000) {
          return socket.emit('error', { message: 'Message too long (max 2000 chars)' });
        }

        // Gate: mutual interest required
        const mutual = await hasMutualInterest(userId, receiverId);
        if (!mutual) {
          return socket.emit('error', {
            message: 'You can only chat after mutual interest',
          });
        }

        const conversationKey = getConversationKey(userId, receiverId);

        // Persist to database
        const message = await Message.create({
          conversationKey,
          sender: userId,
          receiver: receiverId,
          text: text.trim(),
        });

        // Populate sender info for the client
        const populated = await Message.findById(message._id)
          .populate('sender', 'name profilePhoto profilePic')
          .lean();

        // Send to the conversation room (both users if they've joined)
        io.to(conversationKey).emit('receive_message', populated);

        // Also send to the receiver's personal room in case they
        // haven't joined the conversation room yet (notification)
        io.to(`user_${receiverId}`).emit('new_message_notification', {
          from: {
            _id: userId,
            name: socket.user.name,
          },
          preview: text.trim().substring(0, 100),
          conversationKey,
          messageId: message._id,
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

    // ── Mark messages as read (real-time) ───────────────
    socket.on('mark_read', async ({ partnerId }) => {
      try {
        if (!partnerId) return;

        const conversationKey = getConversationKey(userId, partnerId);

        await Message.updateMany(
          { conversationKey, receiver: userId, readAt: null },
          { readAt: new Date() }
        );

        // Notify the partner that their messages were read
        io.to(conversationKey).emit('messages_read', { by: userId });
      } catch (err) {
        socket.emit('error', { message: 'Failed to mark as read' });
      }
    });

    // ── Get online status of a user ─────────────────────
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
