import Interest from '../models/Interest.js';
import User from '../models/User.js';

/**
 * Interest Controller — send, accept, reject interests & list matches.
 *
 * POST /api/interest/send        — send interest to another user
 * PUT  /api/interest/respond      — accept or reject a received interest
 * GET  /api/interest/received     — list interests received (pending)
 * GET  /api/interest/sent         — list interests sent
 * GET  /api/interest/matches      — list all mutual matches
 */

// ─── Send interest ──────────────────────────────────────
export const sendInterest = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }

    if (senderId.toString() === receiverId) {
      return res.status(400).json({ success: false, message: 'Cannot send interest to yourself' });
    }

    // Verify receiver exists and isn't banned
    const receiver = await User.findById(receiverId).lean();
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (receiver.isBanned) {
      return res.status(400).json({ success: false, message: 'This user is unavailable' });
    }

    // Check if blocked (either direction)
    const currentUser = await User.findById(senderId).lean();
    if ((currentUser.blockedUsers || []).map(String).includes(receiverId)) {
      return res.status(400).json({ success: false, message: 'You have blocked this user' });
    }
    if ((receiver.blockedUsers || []).map(String).includes(senderId.toString())) {
      return res.status(400).json({ success: false, message: 'This user is unavailable' });
    }

    const interest = await Interest.create({ sender: senderId, receiver: receiverId });

    return res.status(201).json({
      success: true,
      message: 'Interest sent ❤️',
      data: interest,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Interest already sent to this user' });
    }
    next(error);
  }
};

// ─── Respond to interest (accept / reject) ──────────────
export const respondToInterest = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { interestId, action } = req.body;

    if (!interestId || !['accept', 'reject'].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: 'interestId and action ("accept" or "reject") are required' });
    }

    const interest = await Interest.findById(interestId);
    if (!interest) {
      return res.status(404).json({ success: false, message: 'Interest not found' });
    }

    // Only the receiver can respond
    if (interest.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only respond to interests sent to you' });
    }

    if (interest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Interest already ${interest.status}` });
    }

    interest.status = action === 'accept' ? 'accepted' : 'rejected';
    await interest.save();

    let isMutual = false;
    if (action === 'accept') {
      const reverseAccepted = await Interest.findOne({
        sender: userId,
        receiver: interest.sender,
        status: 'accepted',
      }).lean();
      isMutual = Boolean(reverseAccepted);
    }

    return res.json({
      success: true,
      message: isMutual
        ? '🎉 It\'s a match! You can now chat with each other.'
        : 'Interest rejected.',
      data: interest,
      isMutual,
    });
  } catch (error) {
    next(error);
  }
};

// ─── List received interests (pending) ──────────────────
export const getReceivedInterests = async (req, res, next) => {
  try {
    const interests = await Interest.find({
      receiver: req.user._id,
      status: 'pending',
    })
      .populate('sender', 'name age city profilePhoto profilePic bio')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, count: interests.length, data: interests });
  } catch (error) {
    next(error);
  }
};

// ─── List sent interests ────────────────────────────────
export const getSentInterests = async (req, res, next) => {
  try {
    const interests = await Interest.find({ sender: req.user._id })
      .populate('receiver', 'name age city profilePhoto profilePic bio')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, count: interests.length, data: interests });
  } catch (error) {
    next(error);
  }
};

// ─── List mutual matches (both accepted) ────────────────
export const getMutualMatches = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find accepted interests where current user is involved.
    // Keep only pairs where reverse direction is also accepted.
    const accepted = await Interest.find({
      $or: [
        { sender: userId, status: 'accepted' },
        { receiver: userId, status: 'accepted' },
      ],
    })
      .populate('sender', 'name age city profilePhoto profilePic bio')
      .populate('receiver', 'name age city profilePhoto profilePic bio')
      .sort({ updatedAt: -1 })
      .lean();

    const userIdStr = userId.toString();
    const matches = [];
    const seenUsers = new Set();

    for (const interest of accepted) {
      const senderId = interest.sender._id.toString();
      const receiverId = interest.receiver._id.toString();
      const otherUser = senderId === userIdStr ? interest.receiver : interest.sender;
      const otherUserId = otherUser._id.toString();

      if (seenUsers.has(otherUserId)) {
        continue;
      }

      const reverseInterest = await Interest.findOne({
        sender: receiverId,
        receiver: senderId,
        status: 'accepted',
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (reverseInterest) {
        seenUsers.add(otherUserId);
        matches.push({
          interestId: interest._id,
          user: otherUser,
          matchedAt:
            reverseInterest.updatedAt > interest.updatedAt
              ? reverseInterest.updatedAt
              : interest.updatedAt,
        });
      }
    }

    return res.json({ success: true, count: matches.length, data: matches });
  } catch (error) {
    next(error);
  }
};
