import db from '../db.js';

/**
 * MatchResult Model — caches computed match scores between two users.
 */

export function upsertMatchResult({ userId, matchedUserId, score, breakdown, explanation, expiresAt }) {
  db.prepare(`
    INSERT INTO match_results (userId, matchedUserId, score, breakdown, explanation, expiresAt)
    VALUES (@userId, @matchedUserId, @score, @breakdown, @explanation, @expiresAt)
    ON CONFLICT(userId, matchedUserId) DO UPDATE SET
      score = @score, breakdown = @breakdown, explanation = @explanation,
      expiresAt = @expiresAt, updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).run({
    userId,
    matchedUserId,
    score,
    breakdown: JSON.stringify(breakdown || {}),
    explanation: explanation || null,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
  });
}

/**
 * Fetch cached match results for a user, with matchedUser info populated.
 */
export function findMatchResultsWithUser(userId, { limit = 10 } = {}) {
  const rows = db.prepare(`
    SELECT mr.id, mr.userId, mr.matchedUserId, mr.score, mr.breakdown, mr.explanation,
      mr.createdAt, mr.updatedAt,
      u.id as mu_id, u.name as mu_name, u.age as mu_age, u.city as mu_city,
      u.education as mu_education, u.profilePhoto as mu_profilePhoto,
      u.interests as mu_interests
    FROM match_results mr
    JOIN users u ON mr.matchedUserId = u.id
    WHERE mr.userId = ?
    ORDER BY mr.score DESC
    LIMIT ?
  `).all(userId, limit);

  return rows.map(r => ({
    _id: r.id, id: r.id,
    user: r.userId,
    matchedUser: {
      _id: r.mu_id, id: r.mu_id, name: r.mu_name, age: r.mu_age,
      city: r.mu_city, education: r.mu_education,
      profilePhoto: r.mu_profilePhoto,
      interests: JSON.parse(r.mu_interests || '[]'),
    },
    score: r.score,
    breakdown: JSON.parse(r.breakdown || '{}'),
    explanation: r.explanation,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }));
}

export function bulkUpsertMatchResults(items) {
  const stmt = db.prepare(`
    INSERT INTO match_results (userId, matchedUserId, score, breakdown, explanation, expiresAt)
    VALUES (@userId, @matchedUserId, @score, @breakdown, @explanation, @expiresAt)
    ON CONFLICT(userId, matchedUserId) DO UPDATE SET
      score = @score, breakdown = @breakdown, explanation = @explanation,
      expiresAt = @expiresAt, updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `);

  const tx = db.transaction((rows) => { for (const r of rows) stmt.run(r); });

  tx(items.map(i => ({
    userId: i.userId,
    matchedUserId: i.matchedUserId,
    score: i.score,
    breakdown: JSON.stringify(i.breakdown || {}),
    explanation: i.explanation || null,
    expiresAt: i.expiresAt ? new Date(i.expiresAt).toISOString() : null,
  })));
}

export function deleteAllMatchResults() {
  db.prepare('DELETE FROM match_results').run();
}
