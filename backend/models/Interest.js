import mongoose from 'mongoose';

/**
 * Interest Schema — tracks "send interest" actions between users.
 *
 * A mutual match exists when BOTH directions have status === 'accepted'.
 * The chat system queries this model to gate conversations.
 *
 * Lifecycle:  sender → sends interest (status: 'pending')
 *             receiver → accepts (status: 'accepted') or rejects ('rejected')
 */

const interestSchema = new mongoose.Schema(
  {
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
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// A user can only send one interest to another user
interestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
// Fast lookup for "interests received by me"
interestSchema.index({ receiver: 1, status: 1 });

const Interest = mongoose.model('Interest', interestSchema);
export default Interest;
