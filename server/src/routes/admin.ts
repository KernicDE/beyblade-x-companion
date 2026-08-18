import { Router } from 'express';
import { z } from 'zod';
import {
  listUsers,
  getUserById,
  setUserRole,
  setUserBan,
  promoteRatingsForUser,
  countUserContributions,
  createAuditLog,
} from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validate.js';
import { toPublicUser } from '../utils/user.js';
import { generateId } from '../utils/id.js';
import type { Role } from '../types/index.js';

const router = Router();

router.use(requireAuth);

router.get('/users', requireRole('Council'), (_req, res) => {
  const users = listUsers().map(toPublicUser);
  res.json({ users });
});

const roleSchema = z.object({
  role: z.enum(['Council', 'Referee', 'Blader', 'Rookie Blader']),
});

router.patch(
  '/users/:id/role',
  requireRole('Council'),
  validateBody(roleSchema),
  (req, res, next) => {
    try {
      const targetId = req.params.id as string;
      const { role } = req.body as z.infer<typeof roleSchema>;
      const target = getUserById(targetId);
      if (!target) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      setUserRole(targetId, role);
      createAuditLog({
        id: generateId(),
        actorId: req.user!.id,
        action: 'set_role',
        targetType: 'user',
        targetId,
        meta: { newRole: role, previousRole: target.role },
        createdAt: new Date().toISOString(),
      });
      res.json({ user: toPublicUser(getUserById(targetId)!) });
    } catch (err) {
      next(err);
    }
  }
);

const banSchema = z.object({
  reason: z.string().min(1).max(500),
});

router.post(
  '/users/:id/ban',
  requireRole('Referee'),
  validateBody(banSchema),
  (req, res, next) => {
    try {
      const targetId = req.params.id as string;
      const { reason } = req.body as z.infer<typeof banSchema>;
      const target = getUserById(targetId);
      if (!target) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      if (target.role === 'Council') {
        res.status(403).json({ error: 'Cannot ban Council members' });
        return;
      }
      setUserBan(targetId, true, reason, req.user!.id);
      createAuditLog({
        id: generateId(),
        actorId: req.user!.id,
        action: 'ban_user',
        targetType: 'user',
        targetId,
        meta: { reason },
        createdAt: new Date().toISOString(),
      });
      res.json({ user: toPublicUser(getUserById(targetId)!) });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/users/:id/unban', requireRole('Referee'), (req, res, next) => {
  try {
    const targetId = req.params.id as string;
    const target = getUserById(targetId);
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    setUserBan(targetId, false, null, null);
    createAuditLog({
      id: generateId(),
      actorId: req.user!.id,
      action: 'unban_user',
      targetType: 'user',
      targetId,
      createdAt: new Date().toISOString(),
    });
    res.json({ user: toPublicUser(getUserById(targetId)!) });
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/promote', requireRole('Referee'), (req, res, next) => {
  try {
    const targetId = req.params.id as string;
    const target = getUserById(targetId);
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (target.role !== 'Rookie Blader') {
      res.status(400).json({ error: 'Only Rookie Bladers can be promoted' });
      return;
    }
    setUserRole(targetId, 'Blader');
    promoteRatingsForUser(targetId);
    createAuditLog({
      id: generateId(),
      actorId: req.user!.id,
      action: 'promote_user',
      targetType: 'user',
      targetId,
      meta: { previousRole: 'Rookie Blader', newRole: 'Blader' },
      createdAt: new Date().toISOString(),
    });
    res.json({ user: toPublicUser(getUserById(targetId)!) });
  } catch (err) {
    next(err);
  }
});

export function maybeAutoPromote(userId: string): { promoted: boolean; role?: Role } {
  const user = getUserById(userId);
  if (!user || user.role !== 'Rookie Blader') return { promoted: false };
  if (countUserContributions(userId) >= 10) {
    setUserRole(userId, 'Blader');
    promoteRatingsForUser(userId);
    createAuditLog({
      id: generateId(),
      actorId: userId,
      action: 'auto_promote_user',
      targetType: 'user',
      targetId: userId,
      meta: { previousRole: 'Rookie Blader', newRole: 'Blader', contributions: countUserContributions(userId) },
      createdAt: new Date().toISOString(),
    });
    return { promoted: true, role: 'Blader' };
  }
  return { promoted: false };
}

export default router;
