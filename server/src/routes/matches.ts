import { Router } from 'express';
import { z } from 'zod';
import { listMatches, getMatchById, createMatch, updateMatch, deleteMatch } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validate.js';
import { generateId } from '../utils/id.js';
import { maybeAutoPromote } from './admin.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ matches: listMatches(req.user!.id) });
});

const matchSchema = z.object({
  date: z.string().min(1),
  myBeySource: z.enum(['bey', 'ownedBey', 'build']),
  myBeyId: z.string().min(1),
  opponentName: z.string().min(1).max(200),
  opponentBeyId: z.string().min(1).nullable().optional(),
  opponentCombo: z.string().max(500).nullable().optional(),
  result: z.enum(['win', 'loss']),
  finishType: z.enum(['xtreme', 'over', 'burst', 'spin']).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

router.post('/', validateBody(matchSchema), (req, res, next) => {
  try {
    const user = req.user!;
    const body = req.body as z.infer<typeof matchSchema>;
    const match = createMatch(
      {
        id: generateId(),
        userId: user.id,
        ...body,
        createdAt: new Date().toISOString(),
      },
      user.role
    );
    const promotion = maybeAutoPromote(user.id);
    res.status(201).json({ match, promotion });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validateBody(matchSchema.partial()), (req, res, next) => {
  try {
    const id = req.params.id as string;
    const body = req.body as z.infer<typeof matchSchema>;
    const match = updateMatch(req.user!.id, id, body, req.user!.role);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    res.json({ match });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;
    const deleted = deleteMatch(req.user!.id, id);
    if (!deleted) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
