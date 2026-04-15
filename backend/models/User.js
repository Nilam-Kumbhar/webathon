import pool from '../db.js';

/**
 * User Model — PostgreSQL-backed user CRUD operations.
 *
 * JSON columns: interests, blockedUsers, lifestylePreferences,
 *               dailySuggestionsShown, partnerPreferences
 * Boolean column: isBanned (stored as 0/1)
 * Nested object: verification (flattened to verification_* columns)
 */

// ─── Columns to SELECT (excludes password) ──────────────
const PUBLIC_COLUMNS = [
  'id', 'name', 'email', 'gender', '"dateOfBirth"', 'age', 'city', 'state', 'country',
  'education', 'occupation', 'job', 'salary', 'religion', 'caste', 'bio', 'interests',
  '"profilePhoto"', '"profilePic"', '"preferredAgeMin"', '"preferredAgeMax"', '"preferredCity"',
  '"preferredEducation"', '"preferredJob"', '"preferredReligion"', '"preferredCaste"',
  '"lifestylePreferences"', '"partnerPreferences"', 'verification_documentUrl',
  'verification_status', 'verification_reviewedBy', 'verification_reviewedAt',
  '"videoIntroUrl"', '"blockedUsers"', '"dailySuggestionsShown"', '"dailySuggestionsDate"',
  'role', '"isBanned"', '"createdAt"', '"updatedAt"',
].join(', ');

/**
 * Parse a raw database row into a user object compatible with existing controllers.
 */
export function parseUser(row) {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    interests: JSON.parse(row.interests || '[]'),
    blockedUsers: JSON.parse(row.blockedUsers || '[]'),
    lifestylePreferences: JSON.parse(row.lifestylePreferences || '[]'),
    dailySuggestionsShown: JSON.parse(row.dailySuggestionsShown || '[]'),
    partnerPreferences: JSON.parse(row.partnerPreferences || '{}'),
    isBanned: Boolean(row.isBanned),
    verification: {
      documentUrl: row.verification_documenturl || null,
      status: row.verification_status || 'unverified',
      reviewedBy: row.verification_reviewedby || null,
      reviewedAt: row.verification_reviewedat || null,
    },
  };
}

function computeAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function nowISO() {
  return new Date().toISOString();
}

export async function createUser(data) {
  const age = computeAge(data.dateOfBirth);
  const now = nowISO();

  const result = await pool.query(`
    INSERT INTO users (
      name, email, password, gender, "dateOfBirth", age, city, state, country,
      education, occupation, job, salary, religion, caste, bio, interests,
      "profilePhoto", "profilePic", "preferredAgeMin", "preferredAgeMax", "preferredCity",
      "preferredEducation", "preferredJob", "preferredReligion", "preferredCaste",
      "lifestylePreferences", "partnerPreferences", verification_status, role, "isBanned",
      "createdAt", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
    ) RETURNING id
  `, [
    data.name,
    (data.email || '').toLowerCase().trim(),
    data.password,
    data.gender || null,
    data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
    age,
    data.city || null,
    data.state || null,
    data.country || 'India',
    data.education || null,
    data.occupation || null,
    data.job || null,
    data.salary ?? null,
    data.religion || null,
    data.caste || null,
    data.bio || null,
    JSON.stringify(data.interests || []),
    data.profilePhoto || null,
    data.profilePic || '',
    data.preferredAgeMin ?? 18,
    data.preferredAgeMax ?? 60,
    data.preferredCity || null,
    data.preferredEducation || null,
    data.preferredJob || null,
    data.preferredReligion || null,
    data.preferredCaste || null,
    JSON.stringify(data.lifestylePreferences || []),
    JSON.stringify(data.partnerPreferences || {}),
    'unverified',
    data.role || 'user',
    data.isBanned ? 1 : 0,
    now, now,
  ]);

  return findUserById(result.rows[0].id);
}

export async function findUserById(id) {
  const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return parseUser(rows[0] || null);
}

export async function findUserByIdWithPassword(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return parseUser(rows[0] || null);
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE LOWER(email) = LOWER($1)`,
    [(email || '').toLowerCase().trim()]
  );
  return parseUser(rows[0] || null);
}

export async function findUserByEmailWithPassword(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [(email || '').toLowerCase().trim()]
  );
  return parseUser(rows[0] || null);
}

export async function updateUser(id, updates) {
  // Compute age if dateOfBirth changes
  if (updates.dateOfBirth !== undefined) {
    updates.age = computeAge(updates.dateOfBirth);
    if (updates.dateOfBirth) updates.dateOfBirth = new Date(updates.dateOfBirth).toISOString();
  }

  // Serialize JSON fields
  if (Array.isArray(updates.interests)) updates.interests = JSON.stringify(updates.interests);
  if (Array.isArray(updates.blockedUsers)) updates.blockedUsers = JSON.stringify(updates.blockedUsers);
  if (Array.isArray(updates.lifestylePreferences)) updates.lifestylePreferences = JSON.stringify(updates.lifestylePreferences);
  if (Array.isArray(updates.dailySuggestionsShown)) updates.dailySuggestionsShown = JSON.stringify(updates.dailySuggestionsShown);
  if (updates.partnerPreferences && typeof updates.partnerPreferences === 'object' && !Array.isArray(updates.partnerPreferences)) {
    updates.partnerPreferences = JSON.stringify(updates.partnerPreferences);
  }
  if (updates.isBanned !== undefined) updates.isBanned = updates.isBanned ? 1 : 0;

  // Flatten verification sub-document
  if (updates.verification) {
    const v = updates.verification;
    if (v.documentUrl !== undefined) updates.verification_documentUrl = v.documentUrl;
    if (v.status !== undefined) updates.verification_status = v.status;
    if (v.reviewedBy !== undefined) updates.verification_reviewedBy = v.reviewedBy;
    if (v.reviewedAt !== undefined) {
      updates.verification_reviewedAt = v.reviewedAt instanceof Date
        ? v.reviewedAt.toISOString() : v.reviewedAt;
    }
    delete updates.verification;
  }

  const VALID = new Set([
    'name', 'email', 'password', 'gender', 'dateOfBirth', 'age', 'city', 'state', 'country',
    'education', 'occupation', 'job', 'salary', 'religion', 'caste', 'bio', 'interests',
    'profilePhoto', 'profilePic', 'preferredAgeMin', 'preferredAgeMax', 'preferredCity',
    'preferredEducation', 'preferredJob', 'preferredReligion', 'preferredCaste',
    'lifestylePreferences', 'partnerPreferences', 'verification_documentUrl',
    'verification_status', 'verification_reviewedBy', 'verification_reviewedAt',
    'videoIntroUrl', 'blockedUsers', 'dailySuggestionsShown', 'dailySuggestionsDate',
    'role', 'isBanned',
  ]);

  // Map camelCase field names to quoted PG column names
  const COL_MAP = {
    dateOfBirth: '"dateOfBirth"',
    profilePhoto: '"profilePhoto"',
    profilePic: '"profilePic"',
    preferredAgeMin: '"preferredAgeMin"',
    preferredAgeMax: '"preferredAgeMax"',
    preferredCity: '"preferredCity"',
    preferredEducation: '"preferredEducation"',
    preferredJob: '"preferredJob"',
    preferredReligion: '"preferredReligion"',
    preferredCaste: '"preferredCaste"',
    lifestylePreferences: '"lifestylePreferences"',
    partnerPreferences: '"partnerPreferences"',
    videoIntroUrl: '"videoIntroUrl"',
    blockedUsers: '"blockedUsers"',
    dailySuggestionsShown: '"dailySuggestionsShown"',
    dailySuggestionsDate: '"dailySuggestionsDate"',
    isBanned: '"isBanned"',
  };

  const sets = [];
  const values = [];
  let paramIndex = 1;

  for (const [k, v] of Object.entries(updates)) {
    if (VALID.has(k)) {
      const col = COL_MAP[k] || k;
      sets.push(`${col} = $${paramIndex}`);
      values.push(v ?? null);
      paramIndex++;
    }
  }

  if (sets.length === 0) return findUserById(id);

  sets.push(`"updatedAt" = $${paramIndex}`);
  values.push(nowISO());
  paramIndex++;

  values.push(id);
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${paramIndex}`, values);

  return findUserById(id);
}

export async function findUsers(filter = {}, options = {}) {
  const conditions = ['1=1'];
  const values = [];
  let paramIndex = 1;

  if (filter.gender) {
    conditions.push(`gender = $${paramIndex++}`);
    values.push(filter.gender);
  }
  if (filter.isBanned !== undefined) {
    conditions.push(`"isBanned" = $${paramIndex++}`);
    values.push(filter.isBanned ? 1 : 0);
  }
  if (filter.search) {
    conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    values.push(`%${filter.search}%`);
    paramIndex++;
  }
  if (filter.verification_status) {
    conditions.push(`verification_status = $${paramIndex++}`);
    values.push(filter.verification_status);
  }
  if (filter.excludeIds && filter.excludeIds.length > 0) {
    const placeholders = filter.excludeIds.map(() => `$${paramIndex++}`);
    conditions.push(`id NOT IN (${placeholders.join(',')})`);
    values.push(...filter.excludeIds);
  }

  let sql = `SELECT ${PUBLIC_COLUMNS} FROM users WHERE ${conditions.join(' AND ')}`;
  sql += ` ORDER BY ${options.orderBy || '"createdAt" DESC'}`;
  if (options.limit) { sql += ` LIMIT $${paramIndex++}`; values.push(options.limit); }
  if (options.offset) { sql += ` OFFSET $${paramIndex++}`; values.push(options.offset); }

  const { rows } = await pool.query(sql, values);
  return rows.map(parseUser);
}

export async function countUsers(filter = {}) {
  const conds = ['1=1'];
  const values = [];
  let paramIndex = 1;

  if (filter.search) {
    conds.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    values.push(`%${filter.search}%`);
    paramIndex++;
  }
  if (filter.verification_status) {
    conds.push(`verification_status = $${paramIndex++}`);
    values.push(filter.verification_status);
  }

  const { rows } = await pool.query(
    `SELECT COUNT(*) as c FROM users WHERE ${conds.join(' AND ')}`, values
  );
  return parseInt(rows[0].c);
}

export async function deleteAllUsers() {
  await pool.query('DELETE FROM users');
}
