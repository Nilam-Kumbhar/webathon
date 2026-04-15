import db from '../db.js';

/**
 * Message Model — stores all chat messages.
 *
 * Messages belong to a `conversationKey` which is a deterministic string
 * built from the two participant IDs (smaller ID first) so that both
 * users share the same conversation thread regardless of who initiated.
 */

function parseMessage(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}

export function createMessage({ conversationKey, sender, receiver, text }) {
  const result = db.prepare(
    'INSERT INTO messages (conversationKey, sender, receiver, text) VALUES (?, ?, ?, ?)'
  ).run(conversationKey, sender, receiver, text);
  return parseMessage(db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid));
}

/**
 * Get a single message by ID with sender info populated.
 */
export function findMessageByIdWithSender(id) {
  const row = db.prepare(`
    SELECT m.*,
      u.id as su_id, u.name as su_name,
      u.profilePhoto as su_profilePhoto, u.profilePic as su_profilePic
    FROM messages m
    JOIN users u ON m.sender = u.id
    WHERE m.id = ?
  `).get(id);

  if (!row) return null;
  return {
    _id: row.id, id: row.id,
    conversationKey: row.conversationKey,
    sender: {
      _id: row.su_id, id: row.su_id, name: row.su_name,
      profilePhoto: row.su_profilePhoto, profilePic: row.su_profilePic,
    },
    receiver: row.receiver,
    text: row.text, readAt: row.readAt,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

/**
 * Find messages in a conversation with sender info populated.
 * Returns newest first (caller should reverse for chronological order).
 */
export function findMessagesWithSender(conversationKey, { limit = 50, offset = 0 } = {}) {
  const rows = db.prepare(`
    SELECT m.*,
      u.id as su_id, u.name as su_name,
      u.profilePhoto as su_profilePhoto, u.profilePic as su_profilePic
    FROM messages m
    JOIN users u ON m.sender = u.id
    WHERE m.conversationKey = ?
    ORDER BY m.createdAt DESC
    LIMIT ? OFFSET ?
  `).all(conversationKey, limit, offset);

  return rows.map(r => ({
    _id: r.id, id: r.id,
    conversationKey: r.conversationKey,
    sender: {
      _id: r.su_id, id: r.su_id, name: r.su_name,
      profilePhoto: r.su_profilePhoto, profilePic: r.su_profilePic,
    },
    receiver: r.receiver,
    text: r.text, readAt: r.readAt,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }));
}

export function countMessages(filter = {}) {
  if (filter.conversationKey) {
    return db.prepare('SELECT COUNT(*) as c FROM messages WHERE conversationKey = ?')
      .get(filter.conversationKey).c;
  }
  return db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
}

export function markMessagesAsRead(conversationKey, receiverId) {
  const now = new Date().toISOString();
  const info = db.prepare(`
    UPDATE messages SET readAt = ?, updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE conversationKey = ? AND receiver = ? AND readAt IS NULL
  `).run(now, conversationKey, receiverId);
  return { modifiedCount: info.changes };
}

export function countUnreadMessages(receiverId) {
  return db.prepare(
    'SELECT COUNT(*) as c FROM messages WHERE receiver = ? AND readAt IS NULL'
  ).get(receiverId).c;
}

/**
 * Get conversation list for a user (replaces MongoDB aggregation pipeline).
 * Returns latest message per conversation with partner info and unread counts.
 */
export function getConversationsList(userId) {
  const rows = db.prepare(`
    WITH latest AS (
      SELECT conversationKey, MAX(id) as maxId
      FROM messages
      WHERE sender = @uid OR receiver = @uid
      GROUP BY conversationKey
    )
    SELECT
      m.conversationKey as _id,
      m.text as lastMessage,
      m.createdAt as lastMessageAt,
      m.sender as lastSender,
      CASE WHEN m.sender = @uid THEN m.receiver ELSE m.sender END as partnerId,
      (SELECT COUNT(*) FROM messages m2
       WHERE m2.conversationKey = m.conversationKey
       AND m2.receiver = @uid AND m2.readAt IS NULL) as unreadCount,
      u.id as p_id, u.name as p_name,
      u.profilePhoto as p_profilePhoto, u.profilePic as p_profilePic, u.city as p_city
    FROM messages m
    JOIN latest l ON m.id = l.maxId
    JOIN users u ON u.id = CASE WHEN m.sender = @uid THEN m.receiver ELSE m.sender END
    ORDER BY m.createdAt DESC
  `).all({ uid: userId });

  return rows.map(r => ({
    _id: r._id,
    lastMessage: r.lastMessage, lastMessageAt: r.lastMessageAt,
    lastSender: r.lastSender, partnerId: r.partnerId,
    unreadCount: r.unreadCount,
    partner: {
      _id: r.p_id, id: r.p_id, name: r.p_name,
      profilePhoto: r.p_profilePhoto, profilePic: r.p_profilePic, city: r.p_city,
    },
  }));
}

export function deleteAllMessages() {
  db.prepare('DELETE FROM messages').run();
}
