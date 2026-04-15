import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'app.db'));

// Performance & integrity settings
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Create tables ───────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password TEXT NOT NULL,
    gender TEXT,
    dateOfBirth TEXT,
    age INTEGER,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    education TEXT,
    occupation TEXT,
    job TEXT,
    salary REAL,
    religion TEXT,
    caste TEXT,
    bio TEXT,
    interests TEXT DEFAULT '[]',
    profilePhoto TEXT,
    profilePic TEXT DEFAULT '',
    preferredAgeMin INTEGER DEFAULT 18,
    preferredAgeMax INTEGER DEFAULT 60,
    preferredCity TEXT,
    preferredEducation TEXT,
    preferredJob TEXT,
    preferredReligion TEXT,
    preferredCaste TEXT,
    lifestylePreferences TEXT DEFAULT '[]',
    partnerPreferences TEXT DEFAULT '{}',
    verification_documentUrl TEXT,
    verification_status TEXT DEFAULT 'unverified',
    verification_reviewedBy INTEGER,
    verification_reviewedAt TEXT,
    videoIntroUrl TEXT,
    blockedUsers TEXT DEFAULT '[]',
    dailySuggestionsShown TEXT DEFAULT '[]',
    dailySuggestionsDate TEXT,
    role TEXT DEFAULT 'user',
    isBanned INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_gender_city_age ON users(gender, city, age);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_users_verification ON users(verification_status);
  CREATE INDEX IF NOT EXISTS idx_users_banned ON users(isBanned);

  CREATE TABLE IF NOT EXISTS interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender INTEGER NOT NULL REFERENCES users(id),
    receiver INTEGER NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(sender, receiver)
  );

  CREATE INDEX IF NOT EXISTS idx_interests_receiver_status ON interests(receiver, status);

  CREATE TABLE IF NOT EXISTS match_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    matchedUserId INTEGER NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL CHECK(score >= 0 AND score <= 100),
    breakdown TEXT DEFAULT '{}',
    explanation TEXT,
    expiresAt TEXT,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(userId, matchedUserId)
  );

  CREATE INDEX IF NOT EXISTS idx_match_user_score ON match_results(userId, score DESC);

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversationKey TEXT NOT NULL,
    sender INTEGER NOT NULL REFERENCES users(id),
    receiver INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    readAt TEXT DEFAULT NULL,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_msg_conv_created ON messages(conversationKey, createdAt);
  CREATE INDEX IF NOT EXISTS idx_msg_receiver_read ON messages(receiver, readAt);

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reportedBy INTEGER NOT NULL REFERENCES users(id),
    reportedUser INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL CHECK(reason IN ('fake_profile', 'harassment', 'inappropriate_content', 'spam', 'other')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(reportedBy, reportedUser)
  );
`);

console.log('✅ SQLite database initialized');

export default db;
