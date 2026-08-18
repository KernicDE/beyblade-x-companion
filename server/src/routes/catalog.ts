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
  listComments,
  createComment,
  getBeyMarketPrices,
  getBeyPriceHistory,
} from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validate.js';
import { maybeAutoPromote } from './admin.js';
import { generateId } from '../utils/id.js';

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

router.get('/beys/:id/market-price', (req, res) => {
  const id = req.params.id as string;
  if (!getBeyById(id)) {
    res.status(404).json({ error: 'Bey not found' });
    return;
  }
  const prices = getBeyMarketPrices('priceEur', 3);
  res.json({ beyId: id, averagePriceEur: prices[id] ?? null });
});

router.get('/beys/:id/price-history', (req, res) => {
  const id = req.params.id as string;
  if (!getBeyById(id)) {
    res.status(404).json({ error: 'Bey not found' });
    return;
  }
  res.json({ beyId: id, history: getBeyPriceHistory(id) });
});

router.get('/market-prices', (_req, res) => {
  res.json({ prices: getBeyMarketPrices('priceEur', 3) });
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
  attack: z.number().int().min(0).max(5),
  defense: z.number().int().min(0).max(5),
  stamina: z.number().int().min(0).max(5),
  balance: z.number().int().min(0).max(5),
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


const commentSchema = z.object({
  text: z.string().min(1).max(2000),
});

router.get('/beys/:id/comments', (req, res) => {
  const beyId = req.params.id as string;
  if (!getBeyById(beyId)) {
    res.status(404).json({ error: 'Bey not found' });
    return;
  }
  res.json({ comments: listComments('bey', beyId) });
});

router.post(
  '/beys/:id/comments',
  requireAuth,
  requireRole('Blader', 'Referee', 'Council', 'Rookie Blader'),
  validateBody(commentSchema),
  (req, res, next) => {
    try {
      const beyId = req.params.id as string;
      const user = req.user!;
      const { text } = req.body as z.infer<typeof commentSchema>;
      if (!getBeyById(beyId)) {
        res.status(404).json({ error: 'Bey not found' });
        return;
      }
      const comment = createComment({
        id: generateId(),
        userId: user.id,
        targetType: 'bey',
        targetId: beyId,
        text,
        createdAt: new Date().toISOString(),
      });
      const promotion = maybeAutoPromote(user.id);
      res.json({ comment, promotion });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/parts/:category/:id/comments', (req, res) => {
  const category = req.params.category as string;
  const partId = req.params.id as string;
  if (!getPartById(category, partId)) {
    res.status(404).json({ error: 'Part not found' });
    return;
  }
  res.json({ comments: listComments('part', partId) });
});

router.post(
  '/parts/:category/:id/comments',
  requireAuth,
  requireRole('Blader', 'Referee', 'Council', 'Rookie Blader'),
  validateBody(commentSchema),
  (req, res, next) => {
    try {
      const category = req.params.category as string;
      const partId = req.params.id as string;
      const user = req.user!;
      const { text } = req.body as z.infer<typeof commentSchema>;
      if (!getPartById(category, partId)) {
        res.status(404).json({ error: 'Part not found' });
        return;
      }
      const comment = createComment({
        id: generateId(),
        userId: user.id,
        targetType: 'part',
        targetId: partId,
        text,
        createdAt: new Date().toISOString(),
      });
      const promotion = maybeAutoPromote(user.id);
      res.json({ comment, promotion });
    } catch (err) {
      next(err);
    }
  }
);
