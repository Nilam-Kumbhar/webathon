const Database = require('better-sqlite3');
const db = new Database('e:/Programs/projects/web/backend/data/app.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', JSON.stringify(tables));

tables.forEach(t => {
  const c = db.prepare('SELECT COUNT(*) as c FROM ' + t.name).get();
  console.log(t.name + ':', c.c, 'rows');
});

// Show sample user data
const users = db.prepare('SELECT * FROM users LIMIT 2').all();
console.log('\nSample users:', JSON.stringify(users, null, 2));

db.close();
