import pool from '../db.js';

/**
 * MatchResult Model — caches computed match scores between two users.
 */

export async function upsertMatchResult({ userId, matchedUserId, score, breakdown, explanation, expiresAt }) {
  await pool.query(`
    INSERT INTO match_results ("userId", "matchedUserId", score, breakdown, explanation, "expiresAt")
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT("userId", "matchedUserId") DO UPDATE SET
      score = $3, breakdown = $4, explanation = $5,
      "expiresAt" = $6, "updatedAt" = $7
  `, [
    userId,
    matchedUserId,
    score,
    JSON.stringify(breakdown || {}),
    explanation || null,
    expiresAt ? new Date(expiresAt).toISOString() : null,
    new Date().toISOString(),
  ]);
}

/**
 * Fetch cached match results for a user, with matchedUser info populated.
 */
export async function findMatchResultsWithUser(userId, { limit = 10 } = {}) {
  const { rows } = await pool.query(`
    SELECT mr.id, mr."userId", mr."matchedUserId", mr.score, mr.breakdown, mr.explanation,
      mr."createdAt", mr."updatedAt",
      u.id as mu_id, u.name as mu_name, u.age as mu_age, u.city as mu_city,
      u.education as mu_education, u."profilePhoto" as mu_profilePhoto,
      u.interests as mu_interests
    FROM match_results mr
    JOIN users u ON mr."matchedUserId" = u.id
    WHERE mr."userId" = $1
    ORDER BY mr.score DESC
    LIMIT $2
  `, [userId, limit]);

  return rows.map(r => ({
    _id: r.id, id: r.id,
    user: r.userId,
    matchedUser: {
      _id: r.mu_id, id: r.mu_id, name: r.mu_name, age: r.mu_age,
      city: r.mu_city, education: r.mu_education,
      profilePhoto: r.mu_profilephoto,
      interests: JSON.parse(r.mu_interests || '[]'),
    },
    score: r.score,
    breakdown: JSON.parse(r.breakdown || '{}'),
    explanation: r.explanation,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }));
}

export async function bulkUpsertMatchResults(items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const i of items) {
      await client.query(`
        INSERT INTO match_results ("userId", "matchedUserId", score, breakdown, explanation, "expiresAt")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT("userId", "matchedUserId") DO UPDATE SET
          score = $3, breakdown = $4, explanation = $5,
          "expiresAt" = $6, "updatedAt" = $7
      `, [
        i.userId,
        i.matchedUserId,
        i.score,
        JSON.stringify(i.breakdown || {}),
        i.explanation || null,
        i.expiresAt ? new Date(i.expiresAt).toISOString() : null,
        new Date().toISOString(),
      ]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteAllMatchResults() {
  await pool.query('DELETE FROM match_results');
}
