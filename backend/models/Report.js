import mongoose from 'mongoose';

/**
 * Report Schema — stores user-reported complaints.
 *
 * `reason` uses an enum so the admin dashboard can aggregate by category.
 * `status` tracks the lifecycle of a report through admin review.
 */

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ['fake_profile', 'harassment', 'inappropriate_content', 'spam', 'other'],
      required: true,
    },
    description: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Compound index so a user can only report another user once
reportSchema.index({ reportedBy: 1, reportedUser: 1 }, { unique: true });

const Report = mongoose.model('Report', reportSchema);
export default Report;
