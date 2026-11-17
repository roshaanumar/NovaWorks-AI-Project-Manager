// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
const { openDb, setup } = require('../db');
const { makeApp } = require('../app');

let appPromise; // reused across warm invocations; schema + demo users are set up once per cold start
const getApp = () => (appPromise ||= (async () => makeApp({ db: await setup(await openDb()) }))().catch((e) => { appPromise = null; throw e; }));

module.exports = async (req, res) => {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (e) {
    console.error('Startup failed:', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server failed to start. Check DATABASE_URL and SESSION_SECRET in the Vercel project settings, then see the function logs.' }));
  }
};
