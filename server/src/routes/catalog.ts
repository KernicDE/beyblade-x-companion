import { Router } from 'express';
import { z } from 'zod';
import {
  getCatalog,
  listBeys,
  getBeyById,
  listParts,
  getPartById,
  getUserBeyRating,
  getUserPartRating,
  getBeyRatingSummary,
  getPartRatingSummary,
  upsertBeyRating,
  upsertPartRating,
} from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validate.js';
import { maybeAutoPromote } from './admin.js';

const router = Router();

router.get('/catalog', (_req, res) => {
  const { parts, beys } = getCatalog();
  res.json({ parts, beys });
});

router.get('/beys', (_req, res) => {
  res.json({ beys: listBeys() });
});

router.get('/beys/:id', (req, res) => {
  const id = req.params.id as string;
  const bey = getBeyById(id);
  if (!bey) {
    res.status(404).json({ error: 'Bey not found' });
    return;
  }
  const ratings = getBeyRatingSummary(id);
  const userRating = req.user ? getUserBeyRating(req.user.id, id) : undefined;
  res.json({ bey, ratings, userRating });
});

router.get('/parts', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  res.json({ parts: listParts(category) });
});

router.get('/parts/:category/:id', (req, res) => {
  const category = req.params.category as string;
  const id = req.params.id as string;
  const part = getPartById(category, id);
  if (!part) {
    res.status(404).json({ error: 'Part not found' });
    return;
  }
  const ratings = getPartRatingSummary(id);
  const userRating = req.user ? getUserPartRating(req.user.id, id) : undefined;
  res.json({ part, ratings, userRating });
});

const ratingSchema = z.object({
  attack: z.number().min(0).max(5),
  defense: z.number().min(0).max(5),
  stamina: z.number().min(0).max(5),
  balance: z.number().min(0).max(5),
});

router.post(
  '/beys/:id/ratings',
  requireAuth,
  requireRole('Blader', 'Referee', 'Council', 'Rookie Blader'),
  validateBody(ratingSchema),
  (req, res, next) => {
    try {
      const beyId = req.params.id as string;
      const user = req.user!;
      const ratings = req.body as z.infer<typeof ratingSchema>;
      if (!getBeyById(beyId)) {
        res.status(404).json({ error: 'Bey not found' });
        return;
      }
      const record = upsertBeyRating(user.id, beyId, ratings, user.role);
      const promotion = maybeAutoPromote(user.id);
      res.json({ rating: record, ratings: getBeyRatingSummary(beyId), promotion });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/parts/:category/:id/ratings',
  requireAuth,
  requireRole('Blader', 'Referee', 'Council', 'Rookie Blader'),
  validateBody(ratingSchema),
  (req, res, next) => {
    try {
      const category = req.params.category as string;
      const partId = req.params.id as string;
      const user = req.user!;
      const ratings = req.body as z.infer<typeof ratingSchema>;
      if (!getPartById(category, partId)) {
        res.status(404).json({ error: 'Part not found' });
        return;
      }
      const record = upsertPartRating(user.id, partId, ratings, user.role);
      const promotion = maybeAutoPromote(user.id);
      res.json({ rating: record, ratings: getPartRatingSummary(partId), promotion });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
