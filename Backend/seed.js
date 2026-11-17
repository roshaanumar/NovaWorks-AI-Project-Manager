try { process.loadEnvFile?.('.env'); } catch {}
const { openDb, setup } = require('./db');
(async () => {
  const db = await setup(await openDb());
  const [{ c }] = await db.query('SELECT COUNT(*)::int AS c FROM users');
  console.log('Seeded demo users:', c);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
