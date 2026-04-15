import Interest from '../models/Interest.js';

/**
 * Checks whether two users have a MUTUAL interest (both directions accepted).
 *
 * Mutual interest = A sent interest to B AND B accepted it,
 *                   OR B sent interest to A AND A accepted it.
 *
 * We only need ONE accepted record where one is sender and the other
 * is receiver, because "accepting" an interest means both parties agree.
 *
 * @param {string} userId1
 * @param {string} userId2
 * @returns {Promise<boolean>}
 */
export async function hasMutualInterest(userId1, userId2) {
  const mutual = await Interest.findOne({
    $or: [
      { sender: userId1, receiver: userId2, status: 'accepted' },
      { sender: userId2, receiver: userId1, status: 'accepted' },
    ],
  }).lean();

  return !!mutual;
}

/**
 * Builds a deterministic conversation key from two user IDs.
 * Always puts the lexicographically smaller ID first so both
 * participants produce the same key.
 *
 * @param {string} id1
 * @param {string} id2
 * @returns {string}
 */
export function getConversationKey(id1, id2) {
  return [id1.toString(), id2.toString()].sort().join('_');
}
