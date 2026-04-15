import mongoose from 'mongoose';

/**
 * Message Schema — stores all chat messages.
 *
 * Messages belong to a `conversationKey` which is a deterministic string
 * built from the two participant IDs (smaller ID first) so that both
 * users share the same conversation thread regardless of who initiated.
 *
 * `readAt` is null until the recipient opens the chat, enabling
 * "unread count" queries.
 */

const messageSchema = new mongoose.Schema(
  {
    // Deterministic key: `${smallerId}_${largerId}`
    conversationKey: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Fetch conversation history sorted by time
messageSchema.index({ conversationKey: 1, createdAt: 1 });
// Unread count per receiver
messageSchema.index({ receiver: 1, readAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
