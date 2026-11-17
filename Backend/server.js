// Local server. (On Vercel the entry point is api/index.js.)
try { process.loadEnvFile?.('.env'); } catch {}
const { openDb, setup } = require('./db');
const { makeApp } = require('./app');
(async () => {
  const db = await setup(await openDb());
  const port = process.env.PORT || 3000;
  makeApp({ db }).listen(port, () => console.log(`NovaWorks running on http://localhost:${port} (${db.kind})`));
})().catch((e) => { console.error(e); process.exit(1); });
