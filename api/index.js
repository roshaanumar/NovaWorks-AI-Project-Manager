import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createApp } from '../server/src/app.js';
import { prisma } from '../server/src/db.js';

let appInstance = null;
let dbInitialized = false;

async function ensureDatabase() {
  if (dbInitialized) return;

  // On Vercel serverless environment, point SQLite to /tmp/dev.db
  if (process.env.VERCEL) {
    process.env.DATABASE_URL = 'file:/tmp/dev.db';
  }

  const createTablesSql = [
    `CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL,
      specialization TEXT NOT NULL,
      skills TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS Project (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      clientName TEXT NOT NULL,
      description TEXT NOT NULL,
      managerId TEXT NOT NULL REFERENCES User(id),
      deadline DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      submissionKey TEXT UNIQUE
    );`,
    `CREATE TABLE IF NOT EXISTS Task (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      assigneeId TEXT NOT NULL REFERENCES User(id),
      deadline DATETIME NOT NULL,
      estimatedHours REAL NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS Session (
      id TEXT PRIMARY KEY,
      sid TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      expiresAt DATETIME NOT NULL
    );`,
  ];

  for (const sql of createTablesSql) {
    await prisma.$executeRawUnsafe(sql).catch((err) => {
      console.warn('Table creation warning:', err.message);
    });
  }

  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Auto-seeding 10 demo accounts on Vercel cold start...');
      const demoUsers = [
        { id: 'ADMIN', name: 'Admin', email: 'admin@novaworks.example', role: 'ADMIN', specialization: 'Administrator', skills: ['Company overview', 'transcript creation'] },
        { id: 'PM01', name: 'Ayesha Khan', email: 'ayesha@novaworks.example', role: 'MANAGER', specialization: 'Manager / Web PM', skills: ['Web projects', 'client coordination'] },
        { id: 'PM02', name: 'Bilal Ahmed', email: 'bilal@novaworks.example', role: 'MANAGER', specialization: 'Manager / Mobile PM', skills: ['Mobile projects', 'delivery planning'] },
        { id: 'PM03', name: 'Hina Malik', email: 'hina@novaworks.example', role: 'MANAGER', specialization: 'Manager / AI PM', skills: ['AI projects', 'requirement review'] },
        { id: 'DEV01', name: 'Ali Raza', email: 'ali@novaworks.example', role: 'AGENT', specialization: 'Agent / Full-Stack', skills: ['React', 'frontend integration'] },
        { id: 'DEV02', name: 'Hamza Shah', email: 'hamza@novaworks.example', role: 'AGENT', specialization: 'Agent / Full-Stack', skills: ['Node.js', 'databases', 'APIs'] },
        { id: 'DEV03', name: 'Sara Noor', email: 'sara@novaworks.example', role: 'AGENT', specialization: 'Agent / App Developer', skills: ['Flutter', 'mobile UI'] },
        { id: 'DEV04', name: 'Usman Tariq', email: 'usman@novaworks.example', role: 'AGENT', specialization: 'Agent / App Developer', skills: ['Flutter', 'integration', 'testing'] },
        { id: 'DEV05', name: 'Zain Abbas', email: 'zain@novaworks.example', role: 'AGENT', specialization: 'Agent / AI Developer', skills: ['LLMs', 'extraction', 'prompts'] },
        { id: 'DEV06', name: 'Maryam Asif', email: 'maryam@novaworks.example', role: 'AGENT', specialization: 'Agent / AI Developer', skills: ['Retrieval', 'document processing'] },
      ];

      const passwordHash = await bcrypt.hash('Demo123!', 10);

      for (const u of demoUsers) {
        await prisma.user.create({
          data: {
            id: u.id,
            name: u.name,
            email: u.email,
            passwordHash,
            role: u.role,
            specialization: u.specialization,
            skills: JSON.stringify(u.skills),
          },
        }).catch(() => {});
      }
      console.log('✅ Demo accounts ready on Vercel.');
    }
  } catch (err) {
    console.error('Error during cold start auto-seed check:', err.message);
  }

  dbInitialized = true;
}

export default async function handler(req, res) {
  try {
    await ensureDatabase();
    if (!appInstance) {
      appInstance = createApp();
    }
    return appInstance(req, res);
  } catch (err) {
    console.error('Vercel handler execution error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Serverless execution error: ' + err.message }));
  }
}
