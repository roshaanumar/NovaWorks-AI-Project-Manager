import { prisma } from '../db.js';

export async function requireAuth(req, res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        specialization: true,
        skills: true,
      },
    });

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User session invalid or user removed' });
    }

    // Parse JSON skills into array
    let parsedSkills = [];
    try {
      parsedSkills = typeof user.skills === 'string' ? JSON.parse(user.skills) : (user.skills || []);
    } catch (e) {
      parsedSkills = [];
    }

    req.user = {
      ...user,
      skills: parsedSkills,
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: role '${req.user.role}' does not have access to this resource`,
      });
    }

    next();
  };
}
