// Database layer. PostgreSQL everywhere:
//  - production (Vercel etc.): DATABASE_URL -> `pg` (Neon, Supabase, Vercel Postgres ...)
//  - local dev / tests: no DATABASE_URL -> embedded Postgres (PGlite), persisted in DB_PATH or ':memory:'
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEMO_PASSWORD = 'Demo123!';
const D = 'novaworks.example';
const DEMO_USERS = [
  ['ADMIN', 'Admin', `admin@${D}`, 'ADMIN', 'Administrator', ['Company overview', 'Transcript creation']],
  ['PM01', 'Ayesha Khan', `ayesha@${D}`, 'MANAGER', 'Web PM', ['Web projects', 'Client coordination']],
  ['PM02', 'Bilal Ahmed', `bilal@${D}`, 'MANAGER', 'Mobile PM', ['Mobile projects', 'Delivery planning']],
  ['PM03', 'Hina Malik', `hina@${D}`, 'MANAGER', 'AI PM', ['AI projects', 'Requirement review']],
  ['DEV01', 'Ali Raza', `ali@${D}`, 'AGENT', 'Full-Stack', ['React', 'Frontend integration']],
  ['DEV02', 'Hamza Shah', `hamza@${D}`, 'AGENT', 'Full-Stack', ['Node.js', 'Databases', 'APIs']],
  ['DEV03', 'Sara Noor', `sara@${D}`, 'AGENT', 'App Developer', ['Flutter', 'Mobile UI']],
  ['DEV04', 'Usman Tariq', `usman@${D}`, 'AGENT', 'App Developer', ['Flutter', 'Integration', 'Testing']],
  ['DEV05', 'Zain Abbas', `zain@${D}`, 'AGENT', 'AI Developer', ['LLMs', 'Extraction', 'Prompts']],
  ['DEV06', 'Maryam Asif', `maryam@${D}`, 'AGENT', 'AI Developer', ['Retrieval', 'Document processing']],
];

// camelCase columns are quoted so Postgres keeps their case.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN','MANAGER','AGENT')),
    specialization TEXT,
    skills TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    description TEXT,
    "managerId" TEXT NOT NULL REFERENCES users(id),
    deadline TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    "assigneeId" TEXT NOT NULL REFERENCES users(id),
    deadline TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL CHECK ("estimatedHours" > 0)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks("projectId")`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks("assigneeId")`,
];

// Returns { kind, query(sql, params) -> rows[], tx(fn) } where fn receives { query }.
async function openDb(file = process.env.DB_PATH || './data/pgdata') {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { Pool } = require('pg');
    const local = /@(localhost|127\.0\.0\.1)/.test(url);
    const ssl = local || /sslmode=/.test(url) ? undefined : { rejectUnauthorized: false };
    const pool = new Pool({ connectionString: url, max: 5, ssl });
    return {
      kind: 'pg',
      query: async (sql, p = []) => (await pool.query(sql, p)).rows,
      async tx(fn) {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          const out = await fn({ query: async (sql, p = []) => (await c.query(sql, p)).rows });
          await c.query('COMMIT');
          return out;
        } catch (e) {
          await c.query('ROLLBACK').catch(() => {});
          throw e;
        } finally { c.release(); }
      },
    };
  }
  if (process.env.VERCEL) throw new Error('DATABASE_URL is not set. Add a Postgres connection string in the Vercel project settings.');
  const { PGlite } = require('@electric-sql/pglite');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const pg = file === ':memory:' ? new PGlite() : new PGlite(path.resolve(file));
  await pg.waitReady;
  return {
    kind: 'pglite',
    query: async (sql, p = []) => (await pg.query(sql, p)).rows,
    tx: (fn) => pg.transaction((t) => fn({ query: async (sql, p = []) => (await t.query(sql, p)).rows })),
  };
}

async function migrate(db) {
  await db.tx(async (t) => {
    if (db.kind === 'pg') await t.query('SELECT pg_advisory_xact_lock(727274)'); // cold starts can race
    for (const stmt of SCHEMA) await t.query(stmt);
  });
}

// Idempotent: re-running never duplicates users.
async function seed(db) {
  for (const [id, name, email, role, spec, skills] of DEMO_USERS) {
    const found = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (found.length) {
      await db.query('UPDATE users SET name=$1, role=$2, specialization=$3, skills=$4 WHERE email=$5', [name, role, spec, JSON.stringify(skills), email]);
    } else {
      await db.query(
        'INSERT INTO users (id,name,email,"passwordHash",role,specialization,skills) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
        [id, name, email, bcrypt.hashSync(DEMO_PASSWORD, 10), role, spec, JSON.stringify(skills)]);
    }
  }
}

async function setup(db) { await migrate(db); await seed(db); return db; }

const pub = (u) => u && ({ id: u.id, name: u.name, role: u.role, specialization: u.specialization, skills: JSON.parse(u.skills || '[]') });

// All access rules live here so every route is covered, not just the UI.
function makeStore(db) {
  const PROJ = `SELECT p.*, m.name AS "managerName" FROM projects p JOIN users m ON m.id = p."managerId"`;
  const store = {
    userByEmail: async (email) => (await db.query('SELECT * FROM users WHERE email = $1', [String(email || '').trim().toLowerCase()]))[0],
    userById: async (id) => (await db.query('SELECT * FROM users WHERE id = $1', [id]))[0],
    team: async () => (await db.query(`SELECT * FROM users ORDER BY CASE role WHEN 'ADMIN' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END, id`)).map(pub),

    async getTasks(user, projectId) {
      const base = `SELECT t.*, a.name AS "assigneeName" FROM tasks t JOIN users a ON a.id = t."assigneeId" WHERE t."projectId" = $1`;
      const order = ' ORDER BY t.deadline, t.title';
      if (user.role === 'ADMIN') return db.query(base + order, [projectId]);
      if (user.role === 'MANAGER') {
        const [p] = await db.query('SELECT "managerId" FROM projects WHERE id = $1', [projectId]);
        return p && p.managerId === user.id ? db.query(base + order, [projectId]) : [];
      }
      return db.query(base + ' AND t."assigneeId" = $2' + order, [projectId, user.id]);
    },

    async getProjects(user) {
      let rows;
      if (user.role === 'ADMIN') rows = await db.query(PROJ + ' ORDER BY p.deadline, p.name');
      else if (user.role === 'MANAGER') rows = await db.query(PROJ + ' WHERE p."managerId" = $1 ORDER BY p.deadline, p.name', [user.id]);
      else rows = await db.query(PROJ + ' WHERE p.id IN (SELECT "projectId" FROM tasks WHERE "assigneeId" = $1) ORDER BY p.deadline, p.name', [user.id]);
      return Promise.all(rows.map(async (p) => {
        const tasks = await store.getTasks(user, p.id);
        return { ...p, taskCount: tasks.length, totalHours: tasks.reduce((s, t) => s + t.estimatedHours, 0) };
      }));
    },

    async getProjectById(user, id) {
      const p = (await store.getProjects(user)).find((x) => x.id === id);
      return p ? { ...p, tasks: await store.getTasks(user, id) } : null;
    },

    getMyTasks: (user) => db.query(`SELECT t.*, p.name AS "projectName", p."clientName", m.name AS "managerName"
      FROM tasks t JOIN projects p ON p.id = t."projectId" JOIN users m ON m.id = p."managerId"
      WHERE t."assigneeId" = $1 ORDER BY t.deadline, t.title`, [user.id]),

    // All-or-nothing save (single transaction).
    saveDraft: (draft) => db.tx(async (t) => {
      const out = [];
      for (const p of draft.projects) {
        const pid = crypto.randomUUID();
        await t.query('INSERT INTO projects (id,name,"clientName",description,"managerId",deadline) VALUES ($1,$2,$3,$4,$5,$6)',
          [pid, p.name, p.clientName, p.description, p.managerId, p.deadline]);
        for (const k of p.tasks) {
          await t.query('INSERT INTO tasks (id,"projectId",title,description,"assigneeId",deadline,"estimatedHours") VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [crypto.randomUUID(), pid, k.title, k.description, k.assigneeId, k.deadline, k.estimatedHours]);
        }
        out.push({ id: pid, name: p.name, taskCount: p.tasks.length });
      }
      return { projects: out, projectCount: out.length, taskCount: out.reduce((s, p) => s + p.taskCount, 0) };
    }),
  };
  return store;
}

module.exports = { openDb, migrate, seed, setup, makeStore, pub, DEMO_USERS, DEMO_PASSWORD };
