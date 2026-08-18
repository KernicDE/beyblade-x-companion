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
  listPendingParts,
  listPendingBeys,
  createPartSuggestion,
  createBeySuggestion,
  approvePart,
  rejectPart,
  approveBey,
  rejectBey,
  updatePart,
  updateBey,
} from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validate.js';
import { toPublicUser } from '../utils/user.js';
import { generateId } from '../utils/id.js';
import type { Role, PartCategory } from '../types/index.js';

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


const partCategorySchema = z.enum(['blade', 'assistBlade', 'ratchet', 'bit']);

const partSuggestionSchema = z.object({
  category: partCategorySchema,
  name: z.string().min(1).max(200),
  manufacturer: z.enum(['Takara Tomy', 'Hasbro']).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  releaseDate: z.string().max(50).nullable().optional(),
  releaseWave: z.string().max(100).nullable().optional(),
  description: z.object({ en: z.string(), de: z.string() }).nullable().optional(),
  assessment: z.object({ en: z.string(), de: z.string() }).nullable().optional(),
  officialStats: z
    .object({
      weightGrams: z.number().optional(),
      heightMm: z.number().optional(),
      spinDirection: z.enum(['right', 'left', 'both']).optional(),
      typeTag: z.string().optional(),
    })
    .nullable()
    .optional(),
  baselineRatings: z
    .object({
      attack: z.number().min(0).max(5),
      defense: z.number().min(0).max(5),
      stamina: z.number().min(0).max(5),
      balance: z.number().min(0).max(5),
    })
    .nullable()
    .optional(),
  customLine: z.number().int().min(0).optional(),
});

const beySuggestionSchema = z.object({
  name: z.string().min(1).max(200),
  manufacturer: z.enum(['Takara Tomy', 'Hasbro']).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  releaseDate: z.string().max(50).nullable().optional(),
  releaseWave: z.string().max(100).nullable().optional(),
  priceJpy: z.number().int().nullable().optional(),
  priceUsd: z.number().int().nullable().optional(),
  priceEur: z.number().int().nullable().optional(),
  bladeId: z.string().min(1),
  assistBladeId: z.string().min(1).nullable().optional(),
  ratchetId: z.string().min(1),
  bitId: z.string().min(1),
  assessment: z.object({ en: z.string(), de: z.string() }).nullable().optional(),
  highlights: z
    .object({
      pro: z.object({ en: z.string().array(), de: z.string().array() }),
      con: z.object({ en: z.string().array(), de: z.string().array() }),
      trivia: z.object({ en: z.string().array(), de: z.string().array() }),
    })
    .nullable()
    .optional(),
});

const catalogStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  moderatorNote: z.string().max(1000).optional(),
});

const partUpdateSchema = z.object({
  category: partCategorySchema.optional(),
  name: z.string().min(1).max(200).optional(),
  manufacturer: z.enum(['Takara Tomy', 'Hasbro']).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  releaseDate: z.string().max(50).nullable().optional(),
  releaseWave: z.string().max(100).nullable().optional(),
  description: z.object({ en: z.string(), de: z.string() }).nullable().optional(),
  assessment: z.object({ en: z.string(), de: z.string() }).nullable().optional(),
  officialStats: z
    .object({
      weightGrams: z.number().optional(),
      heightMm: z.number().optional(),
      spinDirection: z.enum(['right', 'left', 'both']).optional(),
      typeTag: z.string().optional(),
    })
    .nullable()
    .optional(),
  ratingsSource: z.enum(['community', 'estimated']).nullable().optional(),
  tier: z.enum(['S', 'A', 'B', 'C', 'F']).nullable().optional(),
  customLine: z.number().int().min(0).optional(),
  baselineRatings: z
    .object({
      attack: z.number().min(0).max(5),
      defense: z.number().min(0).max(5),
      stamina: z.number().min(0).max(5),
      balance: z.number().min(0).max(5),
    })
    .nullable()
    .optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  suggestedBy: z.string().nullable().optional(),
  moderatorNote: z.string().max(1000).nullable().optional(),
});

const beyUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  manufacturer: z.enum(['Takara Tomy', 'Hasbro']).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  releaseDate: z.string().max(50).nullable().optional(),
  releaseWave: z.string().max(100).nullable().optional(),
  priceJpy: z.number().int().nullable().optional(),
  priceUsd: z.number().int().nullable().optional(),
  priceEur: z.number().int().nullable().optional(),
  bladeId: z.string().min(1).optional(),
  assistBladeId: z.string().min(1).nullable().optional(),
  ratchetId: z.string().min(1).optional(),
  bitId: z.string().min(1).optional(),
  assessment: z.object({ en: z.string(), de: z.string() }).nullable().optional(),
  highlights: z
    .object({
      pro: z.object({ en: z.string().array(), de: z.string().array() }),
      con: z.object({ en: z.string().array(), de: z.string().array() }),
      trivia: z.object({ en: z.string().array(), de: z.string().array() }),
    })
    .nullable()
    .optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  suggestedBy: z.string().nullable().optional(),
  moderatorNote: z.string().max(1000).nullable().optional(),
});

router.get('/catalog/pending', requireRole('Referee', 'Council'), (_req, res) => {
  res.json({ parts: listPendingParts(), beys: listPendingBeys() });
});

router.post('/catalog/parts/suggest', validateBody(partSuggestionSchema), (req, res, next) => {
  try {
    const user = req.user!;
    const body = req.body as z.infer<typeof partSuggestionSchema>;
    const part = createPartSuggestion({
      id: generateId(),
      ...body,
      suggestedBy: user.id,
      createdAt: new Date().toISOString(),
    });
    createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'suggest_part',
      targetType: 'part',
      targetId: part.id,
      meta: { category: part.category },
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ part });
  } catch (err) {
    next(err);
  }
});

router.post('/catalog/beys/suggest', validateBody(beySuggestionSchema), (req, res, next) => {
  try {
    const user = req.user!;
    const body = req.body as z.infer<typeof beySuggestionSchema>;
    const bey = createBeySuggestion({
      id: generateId(),
      ...body,
      suggestedBy: user.id,
      createdAt: new Date().toISOString(),
    });
    createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'suggest_bey',
      targetType: 'bey',
      targetId: bey.id,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ bey });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/catalog/parts/:category/:id/status',
  requireRole('Referee', 'Council'),
  validateBody(catalogStatusSchema),
  (req, res, next) => {
    try {
      const category = req.params.category as PartCategory;
      const id = req.params.id as string;
      const { status, moderatorNote } = req.body as z.infer<typeof catalogStatusSchema>;
      const user = req.user!;
      const now = new Date().toISOString();
      const part =
        status === 'approved'
          ? approvePart(id, moderatorNote, user.id, now)
          : rejectPart(id, moderatorNote);
      if (!part) {
        res.status(404).json({ error: 'Part not found' });
        return;
      }
      createAuditLog({
        id: generateId(),
        actorId: user.id,
        action: status === 'approved' ? 'approve_part' : 'reject_part',
        targetType: 'part',
        targetId: id,
        meta: { moderatorNote: moderatorNote ?? null, category },
        createdAt: now,
      });
      res.json({ part });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/catalog/beys/:id/status',
  requireRole('Referee', 'Council'),
  validateBody(catalogStatusSchema),
  (req, res, next) => {
    try {
      const id = req.params.id as string;
      const { status, moderatorNote } = req.body as z.infer<typeof catalogStatusSchema>;
      const user = req.user!;
      const now = new Date().toISOString();
      const bey =
        status === 'approved'
          ? approveBey(id, moderatorNote, user.id, now)
          : rejectBey(id, moderatorNote);
      if (!bey) {
        res.status(404).json({ error: 'Bey not found' });
        return;
      }
      createAuditLog({
        id: generateId(),
        actorId: user.id,
        action: status === 'approved' ? 'approve_bey' : 'reject_bey',
        targetType: 'bey',
        targetId: id,
        meta: { moderatorNote: moderatorNote ?? null },
        createdAt: now,
      });
      res.json({ bey });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/catalog/parts/:category/:id',
  requireRole('Referee', 'Council'),
  validateBody(partUpdateSchema),
  (req, res, next) => {
    try {
      const category = req.params.category as PartCategory;
      const id = req.params.id as string;
      const input = req.body as z.infer<typeof partUpdateSchema>;
      const user = req.user!;
      const part = updatePart(category, id, input);
      if (!part) {
        res.status(404).json({ error: 'Part not found' });
        return;
      }
      createAuditLog({
        id: generateId(),
        actorId: user.id,
        action: 'update_part',
        targetType: 'part',
        targetId: id,
        meta: { category, changes: Object.keys(input) },
        createdAt: new Date().toISOString(),
      });
      res.json({ part });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/catalog/beys/:id',
  requireRole('Referee', 'Council'),
  validateBody(beyUpdateSchema),
  (req, res, next) => {
    try {
      const id = req.params.id as string;
      const input = req.body as z.infer<typeof beyUpdateSchema>;
      const user = req.user!;
      const bey = updateBey(id, input);
      if (!bey) {
        res.status(404).json({ error: 'Bey not found' });
        return;
      }
      createAuditLog({
        id: generateId(),
        actorId: user.id,
        action: 'update_bey',
        targetType: 'bey',
        targetId: id,
        meta: { changes: Object.keys(input) },
        createdAt: new Date().toISOString(),
      });
      res.json({ bey });
    } catch (err) {
      next(err);
    }
  }
);
