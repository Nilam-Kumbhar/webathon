/**
 * Migration script: SQLite → Supabase PostgreSQL
 * Reads all data from the local SQLite DB and pushes schema + data to Supabase.
 */
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL not set in .env');
  process.exit(1);
}

const sqlite = new Database(path.join(__dirname, '..', 'data', 'app.db'));
const pool = new Pool({
  connectionString: SUPABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('✅ Connected to Supabase PostgreSQL');

    // ── 1. Drop existing tables (reverse dependency order) ──
    console.log('\n🗑️  Dropping existing tables if any...');
    await client.query(`
      DROP TABLE IF EXISTS reports CASCADE;
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS match_results CASCADE;
      DROP TABLE IF EXISTS interests CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // ── 2. Create tables ──
    console.log('📦 Creating tables...');

    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        gender TEXT,
        "dateOfBirth" TEXT,
        age INTEGER,
        city TEXT,
        state TEXT,
        country TEXT DEFAULT 'India',
        education TEXT,
        occupation TEXT,
        job TEXT,
        salary DOUBLE PRECISION,
        religion TEXT,
        caste TEXT,
        bio TEXT,
        interests TEXT DEFAULT '[]',
        "profilePhoto" TEXT,
        "profilePic" TEXT DEFAULT '',
        "preferredAgeMin" INTEGER DEFAULT 18,
        "preferredAgeMax" INTEGER DEFAULT 60,
        "preferredCity" TEXT,
        "preferredEducation" TEXT,
        "preferredJob" TEXT,
        "preferredReligion" TEXT,
        "preferredCaste" TEXT,
        "lifestylePreferences" TEXT DEFAULT '[]',
        "partnerPreferences" TEXT DEFAULT '{}',
        verification_documentUrl TEXT,
        verification_status TEXT DEFAULT 'unverified',
        verification_reviewedBy INTEGER,
        verification_reviewedAt TEXT,
        "videoIntroUrl" TEXT,
        "blockedUsers" TEXT DEFAULT '[]',
        "dailySuggestionsShown" TEXT DEFAULT '[]',
        "dailySuggestionsDate" TEXT,
        role TEXT DEFAULT 'user',
        "isBanned" INTEGER DEFAULT 0,
        "createdAt" TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        "updatedAt" TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
      );

      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_gender_city_age ON users(gender, city, age);
      CREATE INDEX idx_users_role ON users(role);
      CREATE INDEX idx_users_verification ON users(verification_status);
      CREATE INDEX idx_users_banned ON users("isBanned");
    `);
    console.log('  ✅ users table created');

    await client.query(`
      CREATE TABLE interests (
        id SERIAL PRIMARY KEY,
        sender INTEGER NOT NULL REFERENCES users(id),
        receiver INTEGER NOT NULL REFERENCES users(id),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
        "createdAt" TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        "updatedAt" TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        UNIQUE(sender, receiver)
      );

      CREATE INDEX idx_interests_receiver_status ON interests(receiver, status);
    `);
    console.log('  ✅ interests table created');

    await client.query(`
      CREATE TABLE match_results (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        "matchedUserId" INTEGER NOT NULL REFERENCES users(id),
        score INTEGER NOT NULL CHECK(score >= 0 AND score <= 100),
        breakdown TEXT DEFAULT '{}',
        explanation TEXT,
        "expiresAt" TEXT,
        "createdAt" TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        "updatedAt" TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        UNIQUE("userId", "matchedUserId")
      );

      CREATE INDEX idx_match_user_score ON match_results("userId", score DESC);
    `);
    console.log('  ✅ match_results table created');

    await client.query(`
      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        "conversationKey" TEXT NOT NULL,
        sender INTEGER NOT NULL REFERENCES users(id),
        receiver INTEGER NOT NULL REFERENCES users(id),
        text TEXT NOT NULL,
        "readAt" TEXT DEFAULT NULL,
        "createdAt" TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        "updatedAt" TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
      );

      CREATE INDEX idx_msg_conv_created ON messages("conversationKey", "createdAt");
      CREATE INDEX idx_msg_receiver_read ON messages(receiver, "readAt");
    `);
    console.log('  ✅ messages table created');

    await client.query(`
      CREATE TABLE reports (
        id SERIAL PRIMARY KEY,
        "reportedBy" INTEGER NOT NULL REFERENCES users(id),
        "reportedUser" INTEGER NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL CHECK(reason IN ('fake_profile', 'harassment', 'inappropriate_content', 'spam', 'other')),
        description TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
        "createdAt" TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        "updatedAt" TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        UNIQUE("reportedBy", "reportedUser")
      );
    `);
    console.log('  ✅ reports table created');

    // ── 3. Migrate data ──
    console.log('\n📂 Migrating data...');

    // -- Users --
    const users = sqlite.prepare('SELECT * FROM users').all();
    if (users.length > 0) {
      for (const u of users) {
        await client.query(`
          INSERT INTO users (
            id, name, email, password, gender, "dateOfBirth", age, city, state, country,
            education, occupation, job, salary, religion, caste, bio, interests,
            "profilePhoto", "profilePic", "preferredAgeMin", "preferredAgeMax", "preferredCity",
            "preferredEducation", "preferredJob", "preferredReligion", "preferredCaste",
            "lifestylePreferences", "partnerPreferences", verification_documentUrl,
            verification_status, verification_reviewedBy, verification_reviewedAt,
            "videoIntroUrl", "blockedUsers", "dailySuggestionsShown", "dailySuggestionsDate",
            role, "isBanned", "createdAt", "updatedAt"
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
            $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41
          )
        `, [
          u.id, u.name, u.email, u.password, u.gender, u.dateOfBirth, u.age,
          u.city, u.state, u.country, u.education, u.occupation, u.job, u.salary,
          u.religion, u.caste, u.bio, u.interests, u.profilePhoto, u.profilePic,
          u.preferredAgeMin, u.preferredAgeMax, u.preferredCity, u.preferredEducation,
          u.preferredJob, u.preferredReligion, u.preferredCaste, u.lifestylePreferences,
          u.partnerPreferences, u.verification_documentUrl, u.verification_status,
          u.verification_reviewedBy, u.verification_reviewedAt, u.videoIntroUrl,
          u.blockedUsers, u.dailySuggestionsShown, u.dailySuggestionsDate,
          u.role, u.isBanned, u.createdAt, u.updatedAt,
        ]);
      }
      // Reset sequence to max id
      await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));`);
      console.log(`  ✅ ${users.length} users migrated`);
    } else {
      console.log('  ⏭️  No users to migrate');
    }

    // -- Interests --
    const interests = sqlite.prepare('SELECT * FROM interests').all();
    if (interests.length > 0) {
      for (const i of interests) {
        await client.query(`
          INSERT INTO interests (id, sender, receiver, status, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [i.id, i.sender, i.receiver, i.status, i.createdAt, i.updatedAt]);
      }
      await client.query(`SELECT setval('interests_id_seq', (SELECT MAX(id) FROM interests));`);
      console.log(`  ✅ ${interests.length} interests migrated`);
    } else {
      console.log('  ⏭️  No interests to migrate');
    }

    // -- Match Results --
    const matchResults = sqlite.prepare('SELECT * FROM match_results').all();
    if (matchResults.length > 0) {
      for (const m of matchResults) {
        await client.query(`
          INSERT INTO match_results (id, "userId", "matchedUserId", score, breakdown, explanation, "expiresAt", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [m.id, m.userId, m.matchedUserId, m.score, m.breakdown, m.explanation, m.expiresAt, m.createdAt, m.updatedAt]);
      }
      await client.query(`SELECT setval('match_results_id_seq', (SELECT MAX(id) FROM match_results));`);
      console.log(`  ✅ ${matchResults.length} match_results migrated`);
    } else {
      console.log('  ⏭️  No match_results to migrate');
    }

    // -- Messages --
    const messages = sqlite.prepare('SELECT * FROM messages').all();
    if (messages.length > 0) {
      for (const m of messages) {
        await client.query(`
          INSERT INTO messages (id, "conversationKey", sender, receiver, text, "readAt", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [m.id, m.conversationKey, m.sender, m.receiver, m.text, m.readAt, m.createdAt, m.updatedAt]);
      }
      await client.query(`SELECT setval('messages_id_seq', (SELECT MAX(id) FROM messages));`);
      console.log(`  ✅ ${messages.length} messages migrated`);
    } else {
      console.log('  ⏭️  No messages to migrate');
    }

    // -- Reports --
    const reports = sqlite.prepare('SELECT * FROM reports').all();
    if (reports.length > 0) {
      for (const r of reports) {
        await client.query(`
          INSERT INTO reports (id, "reportedBy", "reportedUser", reason, description, status, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [r.id, r.reportedBy, r.reportedUser, r.reason, r.description, r.status, r.createdAt, r.updatedAt]);
      }
      await client.query(`SELECT setval('reports_id_seq', (SELECT MAX(id) FROM reports));`);
      console.log(`  ✅ ${reports.length} reports migrated`);
    } else {
      console.log('  ⏭️  No reports to migrate');
    }

    console.log('\n🎉 Migration complete! All data pushed to Supabase.');

  } catch (err) {
    console.error('❌ Migration error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

run();
