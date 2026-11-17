import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaSessionStore } from './sessionStore.js';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';
import { teamRouter } from './routes/team.js';
import { aiRouter } from './routes/ai.js';

dotenv.config();

export function createApp() {
  const app = express();
  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const SESSION_SECRET = process.env.SESSION_SECRET || 'novaworks-super-secret-session-key-2026-secure';

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible inline fonts & styles
    })
  );

  // CORS: Allow local dev origin or same-origin/Vercel preview domains with credentials
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin serverless)
        if (!origin) return callback(null, true);
        if (
          origin === CLIENT_ORIGIN ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in preview/demo mode
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Express Session with persistent SQLite Prisma store
  app.use(
    session({
      store: new PrismaSessionStore(),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid',
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Rate limiter for authentication endpoints
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again later.' },
  });

  // Routes
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/team', teamRouter);
  app.use('/api/ai', aiRouter);

  // Root healthcheck
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'NovaWorks AI Project Manager API',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date(),
    });
  });

  // Central 404 handler for unmatched API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Central error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
