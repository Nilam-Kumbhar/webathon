import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Verify connection on startup
pool.query('SELECT 1')
  .then(() => console.log('✅ Connected to Supabase PostgreSQL'))
  .catch((err) => {
    console.error('❌ Failed to connect to Supabase PostgreSQL:', err.message);
    process.exit(1);
  });

export default pool;
