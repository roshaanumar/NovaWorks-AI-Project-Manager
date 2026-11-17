import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { parseTranscriptWithGemini } from '../services/aiService.js';

export const aiRouter = express.Router();

const parseTranscriptInputSchema = z.object({
  transcript: z.string().trim().min(1, 'Transcript cannot be empty'),
});

// POST /api/ai/parse-transcript (ADMIN only)
aiRouter.post('/parse-transcript', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const parseResult = parseTranscriptInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Transcript cannot be empty',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { transcript } = parseResult.data;

    // Load team members from DB (id, name, role, specialization, skills ONLY - NEVER password, hash, or email)
    const teamMembers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        specialization: true,
        skills: true,
      },
      orderBy: { name: 'asc' },
    });

    const sanitizedTeam = teamMembers.map((m) => {
      let skills = [];
      try {
        skills = typeof m.skills === 'string' ? JSON.parse(m.skills) : (m.skills || []);
      } catch (e) {
        skills = [];
      }
      return {
        id: m.id,
        name: m.name,
        role: m.role,
        specialization: m.specialization,
        skills,
      };
    });

    try {
      const draft = await parseTranscriptWithGemini(transcript, sanitizedTeam);
      return res.json({ draft });
    } catch (aiErr) {
      console.error('AI parse failure:', aiErr);
      return res.status(502).json({
        error: 'Failed to parse transcript via AI service. Please verify the transcript content.',
      });
    }
  } catch (err) {
    console.error('Error in parse-transcript endpoint:', err);
    res.status(500).json({ error: 'Internal server error while parsing transcript' });
  }
});
