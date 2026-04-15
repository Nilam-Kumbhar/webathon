import db from '../db.js';

/**
 * Interest Model — tracks "send interest" actions between users.
 *
 * A mutual match exists when BOTH directions have status === 'accepted'.
 * The chat system queries this model to gate conversations.
 */

function parseInterest(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}

export function createInterest(senderId, receiverId) {
  const result = db.prepare(
    'INSERT INTO interests (sender, receiver) VALUES (?, ?)'
  ).run(senderId, receiverId);
  return findInterestById(result.lastInsertRowid);
}

export function findInterestById(id) {
  return parseInterest(db.prepare('SELECT * FROM interests WHERE id = ?').get(id));
}

export function findOneInterest(filter) {
  const conds = [];
  const params = {};
  if (filter.sender !== undefined) { conds.push('sender = @sender'); params.sender = Number(filter.sender); }
  if (filter.receiver !== undefined) { conds.push('receiver = @receiver'); params.receiver = Number(filter.receiver); }
  if (filter.status) { conds.push('status = @status'); params.status = filter.status; }

  if (conds.length === 0) return null;
  const row = db.prepare(`SELECT * FROM interests WHERE ${conds.join(' AND ')} LIMIT 1`).get(params);
  return parseInterest(row);
}

export function updateInterest(id, updates) {
  const sets = [];
  const params = { _id: id };

  if (updates.status !== undefined) { sets.push('status = @status'); params.status = updates.status; }
  if (sets.length === 0) return findInterestById(id);

  sets.push("updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  db.prepare(`UPDATE interests SET ${sets.join(', ')} WHERE id = @_id`).run(params);
  return findInterestById(id);
}

/**
 * Received interests (pending) with sender user info populated.
 */
export function findReceivedInterests(receiverId) {
  const rows = db.prepare(`
    SELECT i.id, i.sender, i.receiver, i.status, i.createdAt, i.updatedAt,
      u.id as s_id, u.name as s_name, u.age as s_age, u.city as s_city,
      u.profilePhoto as s_profilePhoto, u.profilePic as s_profilePic, u.bio as s_bio
    FROM interests i
    JOIN users u ON i.sender = u.id
    WHERE i.receiver = ? AND i.status = 'pending'
    ORDER BY i.createdAt DESC
  `).all(receiverId);

  return rows.map(r => ({
    _id: r.id, id: r.id,
    sender: {
      _id: r.s_id, id: r.s_id, name: r.s_name, age: r.s_age,
      city: r.s_city, profilePhoto: r.s_profilePhoto,
      profilePic: r.s_profilePic, bio: r.s_bio,
    },
    receiver: r.receiver,
    status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt,
  }));
}

/**
 * Sent interests with receiver user info populated.
 */
export function findSentInterests(senderId) {
  const rows = db.prepare(`
    SELECT i.id, i.sender, i.receiver, i.status, i.createdAt, i.updatedAt,
      u.id as r_id, u.name as r_name, u.age as r_age, u.city as r_city,
      u.profilePhoto as r_profilePhoto, u.profilePic as r_profilePic, u.bio as r_bio
    FROM interests i
    JOIN users u ON i.receiver = u.id
    WHERE i.sender = ?
    ORDER BY i.createdAt DESC
  `).all(senderId);

  return rows.map(r => ({
    _id: r.id, id: r.id,
    sender: r.sender,
    receiver: {
      _id: r.r_id, id: r.r_id, name: r.r_name, age: r.r_age,
      city: r.r_city, profilePhoto: r.r_profilePhoto,
      profilePic: r.r_profilePic, bio: r.r_bio,
    },
    status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt,
  }));
}

/**
 * Accepted interests involving a user, with both sender and receiver populated.
 */
export function findAcceptedInterestsForUser(userId) {
  const rows = db.prepare(`
    SELECT i.id, i.sender as senderId, i.receiver as receiverId,
      i.status, i.createdAt, i.updatedAt,
      s.id as s_id, s.name as s_name, s.age as s_age, s.city as s_city,
      s.profilePhoto as s_profilePhoto, s.profilePic as s_profilePic, s.bio as s_bio,
      r.id as r_id, r.name as r_name, r.age as r_age, r.city as r_city,
      r.profilePhoto as r_profilePhoto, r.profilePic as r_profilePic, r.bio as r_bio
    FROM interests i
    JOIN users s ON i.sender = s.id
    JOIN users r ON i.receiver = r.id
    WHERE (i.sender = ? OR i.receiver = ?) AND i.status = 'accepted'
    ORDER BY i.updatedAt DESC
  `).all(userId, userId);

  return rows.map(r => ({
    _id: r.id, id: r.id,
    sender: {
      _id: r.s_id, id: r.s_id, name: r.s_name, age: r.s_age,
      city: r.s_city, profilePhoto: r.s_profilePhoto,
      profilePic: r.s_profilePic, bio: r.s_bio,
    },
    receiver: {
      _id: r.r_id, id: r.r_id, name: r.r_name, age: r.r_age,
      city: r.r_city, profilePhoto: r.r_profilePhoto,
      profilePic: r.r_profilePic, bio: r.r_bio,
    },
    status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt,
  }));
}

export function deleteAllInterests() {
  db.prepare('DELETE FROM interests').run();
}
