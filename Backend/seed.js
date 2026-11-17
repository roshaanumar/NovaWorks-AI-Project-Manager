const { openDb, seed } = require('./db');
const db = openDb();
seed(db);
console.log('Seeded demo users:', db.prepare('SELECT COUNT(*) c FROM users').get().c);
