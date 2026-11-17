const express = require('express');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { makeStore, pub } = require('./db');
const ai = require('./ai');

function makeApp({ db, llm = ai.callLLM }) {
  const store = makeStore(db);
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  // Stateless signed cookie session: works on serverless (no server-side memory needed).
  app.use(cookieSession({
    name: 'nw_session',
    keys: [process.env.SESSION_SECRET || 'dev-secret-change-me'],
    httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 24 * 3600 * 1000,
  }));

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // Current user always comes from the session, never from the request body.
  const auth = wrap(async (req, res, next) => {
    const u = req.session.userId && await store.userById(req.session.userId);
    if (!u) return res.status(401).json({ error: 'Please log in.' });
    req.user = u;
    next();
  });
  const adminOnly = (req, res, next) => (req.user.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Admin only.' }));

  app.post('/api/login', wrap(async (req, res) => {
    const { email, password } = req.body || {};
    const u = await store.userByEmail(email);
    if (!u || typeof password !== 'string' || !bcrypt.compareSync(password, u.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    req.session = { userId: u.id };
    res.json({ user: pub(u) });
  }));
  app.post('/api/logout', (req, res) => { req.session = null; res.json({ ok: true }); });
  app.get('/api/me', auth, (req, res) => res.json({ user: pub(req.user) }));

  app.get('/api/team', auth, wrap(async (req, res) => res.json({ team: (await store.team()).map(({ id, name, role, specialization }) => ({ id, name, role, specialization })) })));
  app.get('/api/projects', auth, wrap(async (req, res) => res.json({ projects: await store.getProjects(req.user) })));
  app.get('/api/projects/:id', auth, wrap(async (req, res) => {
    const p = await store.getProjectById(req.user, req.params.id);
    if (!p) return res.status(403).json({ error: 'You do not have access to this project.' });
    res.json({ project: p });
  }));
  app.get('/api/tasks/mine', auth, wrap(async (req, res) => res.json({ tasks: await store.getMyTasks(req.user) })));

  // ---- Transcript -> projects/tasks (admin only) ----
  let busy = false; // per-instance guard against double submits
  const finish = async (res, rawDraft) => {
    const { draft, issues } = ai.validateDraft(rawDraft, await store.team());
    if (issues.length) {
      return res.status(422).json({ error: 'Some required information could not be resolved. Nothing was saved. Correct the fields and re-validate.', issues, draft: rawDraft });
    }
    res.json(await store.saveDraft(draft));
  };

  app.post('/api/transcript', auth, adminOnly, wrap(async (req, res) => {
    const transcript = String(req.body?.transcript || '').trim();
    if (!transcript) return res.status(400).json({ error: 'Transcript is empty.' });
    if (busy) return res.status(429).json({ error: 'A conversion is already running. Please wait.' });
    busy = true;
    try {
      let draft;
      try {
        const text = await llm({ system: ai.SYSTEM, user: ai.buildUserPrompt(transcript, ai.toDirectory(await store.team())) });
        draft = ai.extractJson(text);
      } catch (e) {
        return res.status(502).json({ error: `AI conversion failed: ${e.message}. Nothing was saved.` });
      }
      await finish(res, draft);
    } finally { busy = false; }
  }));

  // Revalidate a corrected draft (same validation, same all-or-nothing save).
  app.post('/api/transcript/commit', auth, adminOnly, wrap((req, res) => finish(res, req.body?.draft)));

  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  });
  return app;
}

module.exports = { makeApp };
