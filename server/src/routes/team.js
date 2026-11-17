import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const teamRouter = express.Router();

// GET /api/team - ADMIN and MANAGER only
teamRouter.get('/', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        specialization: true,
        skills: true,
      },
      orderBy: { name: 'asc' },
    });

    const parsedUsers = users.map((u) => {
      let skills = [];
      try {
        skills = typeof u.skills === 'string' ? JSON.parse(u.skills) : (u.skills || []);
      } catch (e) {
        skills = [];
      }
      return {
        ...u,
        skills,
      };
    });

    res.json({ team: parsedUsers });
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});
