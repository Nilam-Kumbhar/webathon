import pool from '../db.js';

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

export async function createMessage({ conversationKey, sender, receiver, text }) {
  const { rows } = await pool.query(
    'INSERT INTO messages ("conversationKey", sender, receiver, text) VALUES ($1, $2, $3, $4) RETURNING *',
    [conversationKey, sender, receiver, text]
  );
  return parseMessage(rows[0]);
}

/**
 * Get a single message by ID with sender info populated.
 */
export async function findMessageByIdWithSender(id) {
  const { rows } = await pool.query(`
    SELECT m.*,
      u.id as su_id, u.name as su_name,
      u."profilePhoto" as su_profilePhoto, u."profilePic" as su_profilePic
    FROM messages m
    JOIN users u ON m.sender = u.id
    WHERE m.id = $1
  `, [id]);

  const row = rows[0];
  if (!row) return null;
  return {
    _id: row.id, id: row.id,
    conversationKey: row.conversationKey,
    sender: {
      _id: row.su_id, id: row.su_id, name: row.su_name,
      profilePhoto: row.su_profilephoto, profilePic: row.su_profilepic,
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
export async function findMessagesWithSender(conversationKey, { limit = 50, offset = 0 } = {}) {
  const { rows } = await pool.query(`
    SELECT m.*,
      u.id as su_id, u.name as su_name,
      u."profilePhoto" as su_profilePhoto, u."profilePic" as su_profilePic
    FROM messages m
    JOIN users u ON m.sender = u.id
    WHERE m."conversationKey" = $1
    ORDER BY m."createdAt" DESC
    LIMIT $2 OFFSET $3
  `, [conversationKey, limit, offset]);

  return rows.map(r => ({
    _id: r.id, id: r.id,
    conversationKey: r.conversationKey,
    sender: {
      _id: r.su_id, id: r.su_id, name: r.su_name,
      profilePhoto: r.su_profilephoto, profilePic: r.su_profilepic,
    },
    receiver: r.receiver,
    text: r.text, readAt: r.readAt,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }));
}

export async function countMessages(filter = {}) {
  if (filter.conversationKey) {
    const { rows } = await pool.query(
      'SELECT COUNT(*) as c FROM messages WHERE "conversationKey" = $1',
      [filter.conversationKey]
    );
    return parseInt(rows[0].c);
  }
  const { rows } = await pool.query('SELECT COUNT(*) as c FROM messages');
  return parseInt(rows[0].c);
}

export async function markMessagesAsRead(conversationKey, receiverId) {
  const now = new Date().toISOString();
  const result = await pool.query(`
    UPDATE messages SET "readAt" = $1, "updatedAt" = $1
    WHERE "conversationKey" = $2 AND receiver = $3 AND "readAt" IS NULL
  `, [now, conversationKey, receiverId]);
  return { modifiedCount: result.rowCount };
}

export async function countUnreadMessages(receiverId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*) as c FROM messages WHERE receiver = $1 AND "readAt" IS NULL',
    [receiverId]
  );
  return parseInt(rows[0].c);
}

/**
 * Get conversation list for a user.
 * Returns latest message per conversation with partner info and unread counts.
 */
export async function getConversationsList(userId) {
  const { rows } = await pool.query(`
    WITH latest AS (
      SELECT "conversationKey", MAX(id) as "maxId"
      FROM messages
      WHERE sender = $1 OR receiver = $1
      GROUP BY "conversationKey"
    )
    SELECT
      m."conversationKey" as _id,
      m.text as "lastMessage",
      m."createdAt" as "lastMessageAt",
      m.sender as "lastSender",
      CASE WHEN m.sender = $1 THEN m.receiver ELSE m.sender END as "partnerId",
      (SELECT COUNT(*) FROM messages m2
       WHERE m2."conversationKey" = m."conversationKey"
       AND m2.receiver = $1 AND m2."readAt" IS NULL) as "unreadCount",
      u.id as p_id, u.name as p_name,
      u."profilePhoto" as p_profilePhoto, u."profilePic" as p_profilePic, u.city as p_city
    FROM messages m
    JOIN latest l ON m.id = l."maxId"
    JOIN users u ON u.id = CASE WHEN m.sender = $1 THEN m.receiver ELSE m.sender END
    ORDER BY m."createdAt" DESC
  `, [userId]);

  return rows.map(r => ({
    _id: r._id,
    lastMessage: r.lastMessage, lastMessageAt: r.lastMessageAt,
    lastSender: r.lastSender, partnerId: r.partnerId,
    unreadCount: parseInt(r.unreadCount),
    partner: {
      _id: r.p_id, id: r.p_id, name: r.p_name,
      profilePhoto: r.p_profilephoto, profilePic: r.p_profilepic, city: r.p_city,
    },
  }));
}

export async function deleteAllMessages() {
  await pool.query('DELETE FROM messages');
}
