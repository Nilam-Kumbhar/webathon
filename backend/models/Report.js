import pool from '../db.js';

/**
 * Report Model — stores user-reported complaints.
 */

function parseReport(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}

export async function createReport({ reportedBy, reportedUser, reason, description }) {
  const { rows } = await pool.query(
    'INSERT INTO reports ("reportedBy", "reportedUser", reason, description) VALUES ($1, $2, $3, $4) RETURNING *',
    [reportedBy, reportedUser, reason, description || null]
  );
  return parseReport(rows[0]);
}

export async function countReportsByUser(reportedUserId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*) as c FROM reports WHERE "reportedUser" = $1',
    [reportedUserId]
  );
  return parseInt(rows[0].c);
}

/**
 * Find reports with reporter and reported user info populated.
 */
export async function findReportsPopulated(filter = {}, { limit = 20, offset = 0 } = {}) {
  const conds = ['1=1'];
  const values = [];
  let paramIndex = 1;

  if (filter.status) {
    conds.push(`rp.status = $${paramIndex++}`);
    values.push(filter.status);
  }

  values.push(limit, offset);
  const limIdx = paramIndex++;
  const offIdx = paramIndex++;

  const { rows } = await pool.query(`
    SELECT rp.*,
      rb.id as rb_id, rb.name as rb_name, rb.email as rb_email,
      ru.id as ru_id, ru.name as ru_name, ru.email as ru_email,
      ru."profilePhoto" as ru_profilePhoto
    FROM reports rp
    JOIN users rb ON rp."reportedBy" = rb.id
    JOIN users ru ON rp."reportedUser" = ru.id
    WHERE ${conds.join(' AND ')}
    ORDER BY rp."createdAt" DESC
    LIMIT $${limIdx} OFFSET $${offIdx}
  `, values);

  return rows.map(r => ({
    _id: r.id, id: r.id,
    reportedBy: { _id: r.rb_id, id: r.rb_id, name: r.rb_name, email: r.rb_email },
    reportedUser: {
      _id: r.ru_id, id: r.ru_id, name: r.ru_name,
      email: r.ru_email, profilePhoto: r.ru_profilephoto,
    },
    reason: r.reason, description: r.description, status: r.status,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }));
}

export async function countReports(filter = {}) {
  const conds = ['1=1'];
  const values = [];
  let paramIndex = 1;

  if (filter.status) {
    conds.push(`status = $${paramIndex++}`);
    values.push(filter.status);
  }

  const { rows } = await pool.query(
    `SELECT COUNT(*) as c FROM reports WHERE ${conds.join(' AND ')}`, values
  );
  return parseInt(rows[0].c);
}

export async function resolveReportsByUser(reportedUserId) {
  await pool.query(`
    UPDATE reports SET status = 'resolved', "updatedAt" = $1
    WHERE "reportedUser" = $2 AND status = 'pending'
  `, [new Date().toISOString(), reportedUserId]);
}

export async function deleteAllReports() {
  await pool.query('DELETE FROM reports');
}
