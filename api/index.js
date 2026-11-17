import bcrypt from 'bcryptjs';
import { createApp } from '../server/src/app.js';
import { prisma } from '../server/src/db.js';

let appInstance;
let initialization;

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

async function initializeDatabase() {
  if (!process.env.POSTGRES_PRISMA_URL) {
    throw new Error('POSTGRES_PRISMA_URL is missing. Connect the Neon database to this Vercel project.');
  }

  await prisma.$connect();
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    const passwordHash = await bcrypt.hash('Demo123!', 10);
    for (const user of demoUsers) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          ...user,
          passwordHash,
          skills: JSON.stringify(user.skills),
        },
      });
    }
    console.log('NovaWorks demo accounts seeded.');
  }
}

async function ensureDatabase() {
  if (!initialization) {
    initialization = initializeDatabase().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

export default async function handler(req, res) {
  try {
    await ensureDatabase();
    appInstance ||= createApp();
    return appInstance(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    return res.status(500).json({ error: 'API initialization failed. Check database configuration and schema.' });
  }
}
