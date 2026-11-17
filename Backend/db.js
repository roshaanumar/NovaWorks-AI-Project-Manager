const Database = require('better-sqlite3');
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

function openDb(file = process.env.DB_PATH || './data/novaworks.db') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN','MANAGER','AGENT')),
      specialization TEXT,
      skills TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      clientName TEXT NOT NULL,
      description TEXT,
      managerId TEXT NOT NULL REFERENCES users(id),
      deadline TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      assigneeId TEXT NOT NULL REFERENCES users(id),
      deadline TEXT NOT NULL,
      estimatedHours REAL NOT NULL CHECK (estimatedHours > 0)
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(projectId);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigneeId);
  `);
  return db;
}

// Idempotent: re-running never duplicates users.
function seed(db) {
  const find = db.prepare('SELECT id FROM users WHERE email = ?');
  const ins = db.prepare('INSERT INTO users (id,name,email,passwordHash,role,specialization,skills) VALUES (?,?,?,?,?,?,?)');
  const upd = db.prepare('UPDATE users SET name=?, role=?, specialization=?, skills=? WHERE email=?');
  for (const [id, name, email, role, spec, skills] of DEMO_USERS) {
    if (find.get(email)) upd.run(name, role, spec, JSON.stringify(skills), email);
    else ins.run(id, name, email, bcrypt.hashSync(DEMO_PASSWORD, 10), role, spec, JSON.stringify(skills));
  }
}

const pub = (u) => u && ({ id: u.id, name: u.name, role: u.role, specialization: u.specialization, skills: JSON.parse(u.skills || '[]') });

// All access rules live here so every route is covered, not just the UI.
function makeStore(db) {
  const PROJ = `SELECT p.*, m.name AS managerName FROM projects p JOIN users m ON m.id = p.managerId`;
  const store = {
    userByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase()),
    userById: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
    team: () => db.prepare('SELECT * FROM users ORDER BY CASE role WHEN \'ADMIN\' THEN 0 WHEN \'MANAGER\' THEN 1 ELSE 2 END, id').all().map(pub),

    getTasks(user, projectId) {
      const base = `SELECT t.*, a.name AS assigneeName FROM tasks t JOIN users a ON a.id = t.assigneeId WHERE t.projectId = ?`;
      const order = ' ORDER BY t.deadline, t.title';
      if (user.role === 'ADMIN') return db.prepare(base + order).all(projectId);
      if (user.role === 'MANAGER') {
        const p = db.prepare('SELECT managerId FROM projects WHERE id = ?').get(projectId);
        return p && p.managerId === user.id ? db.prepare(base + order).all(projectId) : [];
      }
      return db.prepare(base + ' AND t.assigneeId = ?' + order).all(projectId, user.id);
    },

    getProjects(user) {
      let rows;
      if (user.role === 'ADMIN') rows = db.prepare(PROJ + ' ORDER BY p.deadline, p.name').all();
      else if (user.role === 'MANAGER') rows = db.prepare(PROJ + ' WHERE p.managerId = ? ORDER BY p.deadline, p.name').all(user.id);
      else rows = db.prepare(PROJ + ' WHERE p.id IN (SELECT projectId FROM tasks WHERE assigneeId = ?) ORDER BY p.deadline, p.name').all(user.id);
      return rows.map((p) => {
        const tasks = store.getTasks(user, p.id);
        return { ...p, taskCount: tasks.length, totalHours: tasks.reduce((s, t) => s + t.estimatedHours, 0) };
      });
    },

    getProjectById(user, id) {
      const p = store.getProjects(user).find((x) => x.id === id);
      return p ? { ...p, tasks: store.getTasks(user, id) } : null;
    },

    getMyTasks(user) {
      return db.prepare(`SELECT t.*, p.name AS projectName, p.clientName, m.name AS managerName
        FROM tasks t JOIN projects p ON p.id = t.projectId JOIN users m ON m.id = p.managerId
        WHERE t.assigneeId = ? ORDER BY t.deadline, t.title`).all(user.id);
    },

    // All-or-nothing save (single transaction).
    saveDraft(draft) {
      const insP = db.prepare('INSERT INTO projects (id,name,clientName,description,managerId,deadline) VALUES (?,?,?,?,?,?)');
      const insT = db.prepare('INSERT INTO tasks (id,projectId,title,description,assigneeId,deadline,estimatedHours) VALUES (?,?,?,?,?,?,?)');
      return db.transaction(() => {
        const out = [];
        for (const p of draft.projects) {
          const pid = crypto.randomUUID();
          insP.run(pid, p.name, p.clientName, p.description, p.managerId, p.deadline);
          for (const t of p.tasks) insT.run(crypto.randomUUID(), pid, t.title, t.description, t.assigneeId, t.deadline, t.estimatedHours);
          out.push({ id: pid, name: p.name, taskCount: p.tasks.length });
        }
        return { projects: out, projectCount: out.length, taskCount: out.reduce((s, p) => s + p.taskCount, 0) };
      })();
    },
  };
  return store;
}

module.exports = { openDb, seed, makeStore, pub, DEMO_USERS, DEMO_PASSWORD };
