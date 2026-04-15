import {
  createInterest, findInterestById, findOneInterest,
  updateInterest, findReceivedInterests, findSentInterests,
  findAcceptedInterestsForUser,
} from '../models/Interest.js';
import { findUserById } from '../models/User.js';

/**
 * Interest Controller — send, accept, reject interests & list matches.
 */

// ─── Send interest ──────────────────────────────────────
export const sendInterest = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot send interest to yourself' });
    }

    const receiver = await findUserById(Number(receiverId));
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (receiver.isBanned) {
      return res.status(400).json({ success: false, message: 'This user is unavailable' });
    }

    const currentUser = await findUserById(senderId);
    if ((currentUser.blockedUsers || []).map(String).includes(receiverId.toString())) {
      return res.status(400).json({ success: false, message: 'You have blocked this user' });
    }
    if ((receiver.blockedUsers || []).map(String).includes(senderId.toString())) {
      return res.status(400).json({ success: false, message: 'This user is unavailable' });
    }

    const interest = await createInterest(senderId, Number(receiverId));
    return res.status(201).json({
      success: true,
      message: 'Interest sent ❤️',
      data: interest,
    });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique constraint violation
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
      return res.status(400).json({
        success: false,
        message: 'interestId and action ("accept" or "reject") are required',
      });
    }

    const interest = await findInterestById(Number(interestId));
    if (!interest) {
      return res.status(404).json({ success: false, message: 'Interest not found' });
    }
    if (interest.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false, message: 'You can only respond to interests sent to you',
      });
    }
    if (interest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Interest already ${interest.status}` });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const updated = await updateInterest(interest.id, { status: newStatus });

    let isMutual = false;
    if (action === 'accept') {
      const reverseAccepted = await findOneInterest({
        sender: userId, receiver: interest.sender, status: 'accepted',
      });
      isMutual = Boolean(reverseAccepted);
    }

    return res.json({
      success: true,
      message: isMutual
        ? '🎉 It\'s a match! You can now chat with each other.'
        : `Interest ${newStatus}.`,
      data: updated,
      isMutual,
    });
  } catch (error) {
    next(error);
  }
};

// ─── List received interests (pending) ──────────────────
export const getReceivedInterests = async (req, res, next) => {
  try {
    const interests = await findReceivedInterests(req.user._id);
    return res.json({ success: true, count: interests.length, data: interests });
  } catch (error) {
    next(error);
  }
};

// ─── List sent interests ────────────────────────────────
export const getSentInterests = async (req, res, next) => {
  try {
    const interests = await findSentInterests(req.user._id);
    return res.json({ success: true, count: interests.length, data: interests });
  } catch (error) {
    next(error);
  }
};

// ─── List mutual matches (both accepted) ────────────────
export const getMutualMatches = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const accepted = await findAcceptedInterestsForUser(userId);

    const userIdStr = userId.toString();
    const matches = [];
    const seenUsers = new Set();

    for (const interest of accepted) {
      const senderId = interest.sender._id.toString();
      const receiverId = interest.receiver._id.toString();
      const otherUser = senderId === userIdStr ? interest.receiver : interest.sender;
      const otherUserId = otherUser._id.toString();

      if (seenUsers.has(otherUserId)) continue;

      // Check reverse direction exists
      const reverseInterest = await findOneInterest({
        sender: Number(receiverId),
        receiver: Number(senderId),
        status: 'accepted',
      });

      if (reverseInterest) {
        seenUsers.add(otherUserId);
        matches.push({
          interestId: interest._id,
          user: otherUser,
          matchedAt: reverseInterest.updatedAt > interest.updatedAt
            ? reverseInterest.updatedAt : interest.updatedAt,
        });
      }
    }

    return res.json({ success: true, count: matches.length, data: matches });
  } catch (error) {
    next(error);
  }
};
