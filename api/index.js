import fs from 'fs';
import path from 'path';
import { createApp } from '../server/src/app.js';
import { prisma } from '../server/src/db.js';

let appInstance = null;

async function bootstrap() {
  if (appInstance) return appInstance;

  // On Vercel serverless environment, ensure writable SQLite database in /tmp
  if (process.env.VERCEL) {
    const tmpDb = '/tmp/dev.db';
    if (!fs.existsSync(tmpDb)) {
      const candidates = [
        path.resolve('./server/dev.db'),
        path.resolve('./dev.db'),
        path.join(process.cwd(), 'server', 'dev.db'),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            fs.copyFileSync(cand, tmpDb);
            break;
          } catch (e) {
            console.warn('Failed to copy db candidate:', cand, e.message);
          }
        }
      }
    }
  }

  appInstance = createApp();
  return appInstance;
}

export default async function handler(req, res) {
  try {
    const app = await bootstrap();
    return app(req, res);
  } catch (err) {
    console.error('Vercel handler startup error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Serverless invocation error: ' + err.message }));
  }
}
