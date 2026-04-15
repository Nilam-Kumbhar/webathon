import db from '../db.js';

/**
 * User Model — SQLite-backed user CRUD operations.
 *
 * JSON columns: interests, blockedUsers, lifestylePreferences,
 *               dailySuggestionsShown, partnerPreferences
 * Boolean column: isBanned (stored as 0/1)
 * Nested object: verification (flattened to verification_* columns)
 */

// ─── Columns to SELECT (excludes password) ──────────────
const PUBLIC_COLUMNS = [
  'id', 'name', 'email', 'gender', 'dateOfBirth', 'age', 'city', 'state', 'country',
  'education', 'occupation', 'job', 'salary', 'religion', 'caste', 'bio', 'interests',
  'profilePhoto', 'profilePic', 'preferredAgeMin', 'preferredAgeMax', 'preferredCity',
  'preferredEducation', 'preferredJob', 'preferredReligion', 'preferredCaste',
  'lifestylePreferences', 'partnerPreferences', 'verification_documentUrl',
  'verification_status', 'verification_reviewedBy', 'verification_reviewedAt',
  'videoIntroUrl', 'blockedUsers', 'dailySuggestionsShown', 'dailySuggestionsDate',
  'role', 'isBanned', 'createdAt', 'updatedAt',
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
      documentUrl: row.verification_documentUrl || null,
      status: row.verification_status || 'unverified',
      reviewedBy: row.verification_reviewedBy || null,
      reviewedAt: row.verification_reviewedAt || null,
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

export function createUser(data) {
  const age = computeAge(data.dateOfBirth);

  const stmt = db.prepare(`
    INSERT INTO users (
      name, email, password, gender, dateOfBirth, age, city, state, country,
      education, occupation, job, salary, religion, caste, bio, interests,
      profilePhoto, profilePic, preferredAgeMin, preferredAgeMax, preferredCity,
      preferredEducation, preferredJob, preferredReligion, preferredCaste,
      lifestylePreferences, partnerPreferences, verification_status, role, isBanned
    ) VALUES (
      @name, @email, @password, @gender, @dateOfBirth, @age, @city, @state, @country,
      @education, @occupation, @job, @salary, @religion, @caste, @bio, @interests,
      @profilePhoto, @profilePic, @preferredAgeMin, @preferredAgeMax, @preferredCity,
      @preferredEducation, @preferredJob, @preferredReligion, @preferredCaste,
      @lifestylePreferences, @partnerPreferences, @verificationStatus, @role, @isBanned
    )
  `);

  const result = stmt.run({
    name: data.name,
    email: (data.email || '').toLowerCase().trim(),
    password: data.password,
    gender: data.gender || null,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
    age,
    city: data.city || null,
    state: data.state || null,
    country: data.country || 'India',
    education: data.education || null,
    occupation: data.occupation || null,
    job: data.job || null,
    salary: data.salary ?? null,
    religion: data.religion || null,
    caste: data.caste || null,
    bio: data.bio || null,
    interests: JSON.stringify(data.interests || []),
    profilePhoto: data.profilePhoto || null,
    profilePic: data.profilePic || '',
    preferredAgeMin: data.preferredAgeMin ?? 18,
    preferredAgeMax: data.preferredAgeMax ?? 60,
    preferredCity: data.preferredCity || null,
    preferredEducation: data.preferredEducation || null,
    preferredJob: data.preferredJob || null,
    preferredReligion: data.preferredReligion || null,
    preferredCaste: data.preferredCaste || null,
    lifestylePreferences: JSON.stringify(data.lifestylePreferences || []),
    partnerPreferences: JSON.stringify(data.partnerPreferences || {}),
    verificationStatus: 'unverified',
    role: data.role || 'user',
    isBanned: data.isBanned ? 1 : 0,
  });

  return findUserById(result.lastInsertRowid);
}

export function findUserById(id) {
  const row = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(id);
  return parseUser(row);
}

export function findUserByIdWithPassword(id) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return parseUser(row);
}

export function findUserByEmail(email) {
  const row = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE email = ?`)
    .get((email || '').toLowerCase().trim());
  return parseUser(row);
}

export function findUserByEmailWithPassword(email) {
  const row = db.prepare('SELECT * FROM users WHERE email = ?')
    .get((email || '').toLowerCase().trim());
  return parseUser(row);
}

export function updateUser(id, updates) {
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

  const sets = [];
  const params = { _id: id };

  for (const [k, v] of Object.entries(updates)) {
    if (VALID.has(k)) {
      sets.push(`${k} = @${k}`);
      params[k] = v ?? null;
    }
  }

  if (sets.length === 0) return findUserById(id);

  sets.push("updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @_id`).run(params);

  return findUserById(id);
}

export function findUsers(filter = {}, options = {}) {
  const conditions = ['1=1'];
  const params = {};

  if (filter.gender) {
    conditions.push('gender = @gender');
    params.gender = filter.gender;
  }
  if (filter.isBanned !== undefined) {
    conditions.push('isBanned = @isBanned');
    params.isBanned = filter.isBanned ? 1 : 0;
  }
  if (filter.search) {
    conditions.push('(name LIKE @search OR email LIKE @search)');
    params.search = `%${filter.search}%`;
  }
  if (filter.verification_status) {
    conditions.push('verification_status = @vs');
    params.vs = filter.verification_status;
  }
  if (filter.excludeIds && filter.excludeIds.length > 0) {
    const ph = filter.excludeIds.map((_, i) => `@_ex${i}`);
    conditions.push(`id NOT IN (${ph.join(',')})`);
    filter.excludeIds.forEach((v, i) => { params[`_ex${i}`] = v; });
  }

  let sql = `SELECT ${PUBLIC_COLUMNS} FROM users WHERE ${conditions.join(' AND ')}`;
  sql += ` ORDER BY ${options.orderBy || 'createdAt DESC'}`;
  if (options.limit) { sql += ' LIMIT @_lim'; params._lim = options.limit; }
  if (options.offset) { sql += ' OFFSET @_off'; params._off = options.offset; }

  return db.prepare(sql).all(params).map(parseUser);
}

export function countUsers(filter = {}) {
  const conds = ['1=1'];
  const params = {};
  if (filter.search) {
    conds.push('(name LIKE @search OR email LIKE @search)');
    params.search = `%${filter.search}%`;
  }
  if (filter.verification_status) {
    conds.push('verification_status = @vs');
    params.vs = filter.verification_status;
  }
  return db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${conds.join(' AND ')}`).get(params).c;
}

export function deleteAllUsers() {
  db.prepare('DELETE FROM users').run();
}
