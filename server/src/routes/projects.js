import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const projectsRouter = express.Router();

// GET /api/projects - Role scoped
// ADMIN: all projects
// MANAGER: only projects where managerId == req.user.id
// AGENT: 403 forbidden
projectsRouter.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'AGENT') {
      return res.status(403).json({ error: 'Forbidden: Agents cannot list all projects' });
    }

    const where = req.user.role === 'MANAGER' ? { managerId: req.user.id } : {};

    const projects = await prisma.project.findMany({
      where,
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            role: true,
            specialization: true,
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                role: true,
                specialization: true,
              },
            },
          },
          orderBy: { deadline: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ projects });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id - Role scoped
// ADMIN: can view any project
// MANAGER: can view only if managerId == req.user.id
// AGENT: 403 forbidden
projectsRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'AGENT') {
      return res.status(403).json({ error: 'Forbidden: Agents cannot view project details directly' });
    }

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            role: true,
            specialization: true,
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                role: true,
                specialization: true,
              },
            },
          },
          orderBy: { deadline: 'asc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (req.user.role === 'MANAGER' && project.managerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not manage this project' });
    }

    res.json({ project });
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Zod schemas with strict rejection of unknown keys (.strict())
const taskInputSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required'),
  description: z.string().trim().min(1, 'Task description is required'),
  assigneeId: z.string().trim().min(1, 'Assignee ID is required'),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid task deadline date format',
  }),
  estimatedHours: z.number().gt(0, 'Estimated hours must be greater than 0'),
  forceFailure: z.boolean().optional(), // For testing transaction rollback
}).strict();

const singleProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required'),
  clientName: z.string().trim().min(1, 'Client name is required'),
  description: z.string().trim().min(1, 'Project description is required'),
  managerId: z.string().trim().min(1, 'Manager ID is required'),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid project deadline date format',
  }),
  tasks: z.array(taskInputSchema).min(1, 'At least 1 task is required'),
}).strict();

const createFromTranscriptSchema = z.object({
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  // Support both single project or nested in project key
  project: singleProjectSchema.optional(),
  tasks: z.array(taskInputSchema).optional(),
  name: z.string().optional(),
  clientName: z.string().optional(),
  description: z.string().optional(),
  managerId: z.string().optional(),
  deadline: z.string().optional(),
  // Or multiple projects
  projects: z.array(singleProjectSchema).optional(),
  testForceFailIndex: z.number().int().optional(),
}).strict();

// POST /api/projects/create-from-transcript (ADMIN only)
projectsRouter.post('/create-from-transcript', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const parseResult = createFromTranscriptSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { idempotencyKey, testForceFailIndex } = parseResult.data;

    // Check idempotency first: if submissionKey already exists, return original result
    const existingProject = await prisma.project.findUnique({
      where: { submissionKey: idempotencyKey },
      include: {
        manager: {
          select: { id: true, name: true, role: true, specialization: true },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, role: true, specialization: true },
            },
          },
        },
      },
    });

    if (existingProject) {
      return res.status(200).json({
        message: 'Project already created (idempotent response)',
        project: existingProject,
      });
    }

    // Determine normalized project & tasks list
    let projectData;
    let tasksData = [];

    if (parseResult.data.project) {
      projectData = parseResult.data.project;
      tasksData = parseResult.data.project.tasks;
    } else if (parseResult.data.projects && parseResult.data.projects.length > 0) {
      projectData = parseResult.data.projects[0];
      tasksData = parseResult.data.projects[0].tasks;
    } else if (parseResult.data.name && parseResult.data.managerId && parseResult.data.tasks) {
      projectData = {
        name: parseResult.data.name,
        clientName: parseResult.data.clientName,
        description: parseResult.data.description,
        managerId: parseResult.data.managerId,
        deadline: parseResult.data.deadline,
        tasks: parseResult.data.tasks,
      };
      tasksData = parseResult.data.tasks;
    } else {
      return res.status(400).json({ error: 'Missing project or tasks structure' });
    }

    // Server-side verification rules:
    // 1. Manager must exist and have role MANAGER
    const manager = await prisma.user.findUnique({
      where: { id: projectData.managerId },
    });
    if (!manager || manager.role !== 'MANAGER') {
      return res.status(400).json({
        error: `Invalid manager: user ${projectData.managerId} must exist and have role MANAGER`,
      });
    }

    // 2. Validate dates
    const projectDeadline = new Date(projectData.deadline);
    if (isNaN(projectDeadline.getTime())) {
      return res.status(400).json({ error: 'Invalid project deadline date' });
    }

    // 3. Validate tasks: count >= 1
    if (!tasksData || tasksData.length === 0) {
      return res.status(400).json({ error: 'Project must contain at least 1 task' });
    }

    // 4. Validate each task assignee is an AGENT, hours > 0, task deadline <= project deadline
    const assigneeIds = [...new Set(tasksData.map((t) => t.assigneeId))];
    const assignees = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
    });
    const assigneeMap = new Map(assignees.map((a) => [a.id, a]));

    for (let i = 0; i < tasksData.length; i++) {
      const t = tasksData[i];
      const assignee = assigneeMap.get(t.assigneeId);
      if (!assignee || assignee.role !== 'AGENT') {
        return res.status(400).json({
          error: `Task '${t.title}' has invalid assignee ${t.assigneeId}: must be an existing user with role AGENT`,
        });
      }

      if (typeof t.estimatedHours !== 'number' || t.estimatedHours <= 0) {
        return res.status(400).json({
          error: `Task '${t.title}' must have estimatedHours > 0`,
        });
      }

      const taskDeadline = new Date(t.deadline);
      if (isNaN(taskDeadline.getTime())) {
        return res.status(400).json({
          error: `Task '${t.title}' has an invalid deadline format`,
        });
      }

      // Task deadline must be on or before project deadline
      // Comparing YYYY-MM-DD or timestamps
      if (taskDeadline.getTime() > projectDeadline.getTime()) {
        return res.status(400).json({
          error: `Task '${t.title}' deadline (${taskDeadline.toISOString().split('T')[0]}) cannot exceed project deadline (${projectDeadline.toISOString().split('T')[0]})`,
        });
      }
    }

    // Execute in one prisma.$transaction (all or nothing rollback on any error)
    const result = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          name: projectData.name,
          clientName: projectData.clientName,
          description: projectData.description,
          managerId: projectData.managerId,
          deadline: projectDeadline,
          submissionKey: idempotencyKey,
        },
      });

      const createdTasks = [];
      for (let i = 0; i < tasksData.length; i++) {
        const t = tasksData[i];

        // Support testing forced rollback on 3rd task (index 2) or explicit forceFailure flag
        if (testForceFailIndex === i || t.forceFailure) {
          throw new Error(`Simulated forced failure on task index ${i} for transaction rollback verification`);
        }

        const task = await tx.task.create({
          data: {
            projectId: createdProject.id,
            title: t.title,
            description: t.description,
            assigneeId: t.assigneeId,
            deadline: new Date(t.deadline),
            estimatedHours: t.estimatedHours,
          },
          include: {
            assignee: {
              select: { id: true, name: true, role: true, specialization: true },
            },
          },
        });
        createdTasks.push(task);
      }

      return {
        project: {
          ...createdProject,
          manager: {
            id: manager.id,
            name: manager.name,
            role: manager.role,
            specialization: manager.specialization,
          },
          tasks: createdTasks,
        },
      };
    });

    res.status(201).json({
      message: 'Project and tasks created successfully',
      project: result.project,
    });
  } catch (err) {
    console.error('Error creating project from transcript:', err);
    res.status(500).json({
      error: err.message || 'Failed to create project from transcript',
    });
  }
});
