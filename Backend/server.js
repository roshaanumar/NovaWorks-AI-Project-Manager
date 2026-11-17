try { process.loadEnvFile?.('.env'); } catch {}
const { openDb, seed } = require('./db');
const { makeApp } = require('./app');
const db = openDb();
seed(db); // idempotent
const port = process.env.PORT || 3000;
makeApp({ db }).listen(port, () => console.log(`NovaWorks running on http://localhost:${port}`));
