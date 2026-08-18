import { Router } from 'express';
import { z } from 'zod';
import { listBuilds, getBuildById, createBuild, updateBuild, deleteBuild } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validate.js';
import { generateId } from '../utils/id.js';

const router = Router();

router.get('/', (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ builds: listBuilds(userId, { includePublic: true }) });
});

router.get('/mine', requireAuth, (req, res) => {
  res.json({ builds: listBuilds(req.user!.id) });
});

router.get('/:id', (req, res) => {
  const userId = req.user?.id;
  const id = req.params.id as string;
  const build = userId ? getBuildById(userId, id) : undefined;
  if (!build) {
    res.status(404).json({ error: 'Build not found' });
    return;
  }
  res.json({ build });
});

const buildSchema = z.object({
  name: z.string().min(1).max(200),
  note: z.string().max(2000).nullable().optional(),
  bladeId: z.string().min(1),
  assistBladeId: z.string().min(1).nullable().optional(),
  ratchetId: z.string().min(1),
  bitId: z.string().min(1),
  isPublic: z.boolean().optional(),
});

router.use(requireAuth);

router.post('/', validateBody(buildSchema), (req, res, next) => {
  try {
    const user = req.user!;
    const body = req.body as z.infer<typeof buildSchema>;
    const build = createBuild({
      id: generateId(),
      userId: user.id,
      ...body,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ build });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validateBody(buildSchema.partial()), (req, res, next) => {
  try {
    const id = req.params.id as string;
    const body = req.body as z.infer<typeof buildSchema>;
    const build = updateBuild(req.user!.id, id, body);
    if (!build) {
      res.status(404).json({ error: 'Build not found' });
      return;
    }
    res.json({ build });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;
    const deleted = deleteBuild(req.user!.id, id);
    if (!deleted) {
      res.status(404).json({ error: 'Build not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
