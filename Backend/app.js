const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { makeStore, pub } = require('./db');
const ai = require('./ai');

function makeApp({ db, llm = ai.callLLM }) {
  const store = makeStore(db);
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 24 * 3600 * 1000 },
  }));

  // Current user always comes from the session, never from the request body.
  const auth = (req, res, next) => {
    const u = req.session.userId && store.userById(req.session.userId);
    if (!u) return res.status(401).json({ error: 'Please log in.' });
    req.user = u;
    next();
  };
  const adminOnly = (req, res, next) => (req.user.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Admin only.' }));

  app.post('/api/login', (req, res) => {
    const { email, password } = req.body || {};
    const u = store.userByEmail(email);
    if (!u || typeof password !== 'string' || !bcrypt.compareSync(password, u.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error.' });
      req.session.userId = u.id;
      res.json({ user: pub(u) });
    });
  });
  app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
  app.get('/api/me', auth, (req, res) => res.json({ user: pub(req.user) }));

  app.get('/api/team', auth, (req, res) => res.json({ team: store.team().map(({ id, name, role, specialization }) => ({ id, name, role, specialization })) }));
  app.get('/api/projects', auth, (req, res) => res.json({ projects: store.getProjects(req.user) }));
  app.get('/api/projects/:id', auth, (req, res) => {
    const p = store.getProjectById(req.user, req.params.id);
    if (!p) return res.status(403).json({ error: 'You do not have access to this project.' });
    res.json({ project: p });
  });
  app.get('/api/tasks/mine', auth, (req, res) => res.json({ tasks: store.getMyTasks(req.user) }));

  // ---- Transcript -> projects/tasks (admin only) ----
  let busy = false; // server-side guard against double submits
  const finish = (res, rawDraft) => {
    const { draft, issues } = ai.validateDraft(rawDraft, store.team());
    if (issues.length) {
      return res.status(422).json({ error: 'Some required information could not be resolved. Nothing was saved. Correct the fields and re-validate.', issues, draft: rawDraft });
    }
    res.json(store.saveDraft(draft));
  };

  app.post('/api/transcript', auth, adminOnly, async (req, res) => {
    const transcript = String(req.body?.transcript || '').trim();
    if (!transcript) return res.status(400).json({ error: 'Transcript is empty.' });
    if (busy) return res.status(429).json({ error: 'A conversion is already running. Please wait.' });
    busy = true;
    try {
      let draft;
      try {
        const text = await llm({ system: ai.SYSTEM, user: ai.buildUserPrompt(transcript, ai.toDirectory(store.team())) });
        draft = ai.extractJson(text);
      } catch (e) {
        return res.status(502).json({ error: `AI conversion failed: ${e.message}. Nothing was saved.` });
      }
      finish(res, draft);
    } finally { busy = false; }
  });

  // Revalidate a corrected draft (same validation, same all-or-nothing save).
  app.post('/api/transcript/commit', auth, adminOnly, (req, res) => finish(res, req.body?.draft));

  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}

module.exports = { makeApp };
