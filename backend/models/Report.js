import db from '../db.js';

/**
 * Report Model — stores user-reported complaints.
 */

function parseReport(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}

export function createReport({ reportedBy, reportedUser, reason, description }) {
  const result = db.prepare(
    'INSERT INTO reports (reportedBy, reportedUser, reason, description) VALUES (?, ?, ?, ?)'
  ).run(reportedBy, reportedUser, reason, description || null);
  return parseReport(db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid));
}

export function countReportsByUser(reportedUserId) {
  return db.prepare(
    'SELECT COUNT(*) as c FROM reports WHERE reportedUser = ?'
  ).get(reportedUserId).c;
}

/**
 * Find reports with reporter and reported user info populated.
 */
export function findReportsPopulated(filter = {}, { limit = 20, offset = 0 } = {}) {
  const conds = ['1=1'];
  const params = {};
  if (filter.status) { conds.push('rp.status = @status'); params.status = filter.status; }

  const rows = db.prepare(`
    SELECT rp.*,
      rb.id as rb_id, rb.name as rb_name, rb.email as rb_email,
      ru.id as ru_id, ru.name as ru_name, ru.email as ru_email,
      ru.profilePhoto as ru_profilePhoto
    FROM reports rp
    JOIN users rb ON rp.reportedBy = rb.id
    JOIN users ru ON rp.reportedUser = ru.id
    WHERE ${conds.join(' AND ')}
    ORDER BY rp.createdAt DESC
    LIMIT @_lim OFFSET @_off
  `).all({ ...params, _lim: limit, _off: offset });

  return rows.map(r => ({
    _id: r.id, id: r.id,
    reportedBy: { _id: r.rb_id, id: r.rb_id, name: r.rb_name, email: r.rb_email },
    reportedUser: {
      _id: r.ru_id, id: r.ru_id, name: r.ru_name,
      email: r.ru_email, profilePhoto: r.ru_profilePhoto,
    },
    reason: r.reason, description: r.description, status: r.status,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }));
}

export function countReports(filter = {}) {
  const conds = ['1=1'];
  const params = {};
  if (filter.status) { conds.push('status = @status'); params.status = filter.status; }
  return db.prepare(`SELECT COUNT(*) as c FROM reports WHERE ${conds.join(' AND ')}`).get(params).c;
}

export function resolveReportsByUser(reportedUserId) {
  db.prepare(`
    UPDATE reports SET status = 'resolved', updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE reportedUser = ? AND status = 'pending'
  `).run(reportedUserId);
}

export function deleteAllReports() {
  db.prepare('DELETE FROM reports').run();
}
