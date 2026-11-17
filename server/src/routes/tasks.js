import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const tasksRouter = express.Router();

// GET /api/tasks/my - Returns only tasks assigned to the session user
tasksRouter.get('/my', requireAuth, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: req.user.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            description: true,
            deadline: true,
          },
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    });

    res.json({ tasks });
  } catch (err) {
    console.error('Error fetching my tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});
