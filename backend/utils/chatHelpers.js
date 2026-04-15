import { findOneInterest } from '../models/Interest.js';

/**
 * Checks whether two users have a mutual interest (at least one accepted direction).
 */
export function hasMutualInterest(userId1, userId2) {
  const id1 = Number(userId1);
  const id2 = Number(userId2);

  const forward = findOneInterest({ sender: id1, receiver: id2, status: 'accepted' });
  if (forward) return true;

  const reverse = findOneInterest({ sender: id2, receiver: id1, status: 'accepted' });
  return Boolean(reverse);
}

/**
 * Builds a deterministic conversation key from two user IDs.
 * Sorts numerically so "user_3 ↔ user_7" always yields "3_7".
 */
export function getConversationKey(id1, id2) {
  return [id1.toString(), id2.toString()].sort().join('_');
}
