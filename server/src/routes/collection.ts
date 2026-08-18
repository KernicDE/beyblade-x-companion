import { Router } from 'express';
import { z } from 'zod';
import {
  listOwnedBeys,
  getOwnedBeyById,
  createOwnedBey,
  updateOwnedBey,
  deleteOwnedBey,
  listOwnedParts,
  getOwnedPartById,
  createOwnedPart,
  updateOwnedPart,
  deleteOwnedPart,
  getBeyById,
  getPartById,
} from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validate.js';
import { generateId } from '../utils/id.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const userId = req.user!.id;
  res.json({
    ownedBeys: listOwnedBeys(userId),
    ownedParts: listOwnedParts(userId),
  });
});

const ownedBeySchema = z.object({
  beyId: z.string().min(1),
  purchaseDate: z.string().nullable().optional(),
  shop: z.string().max(200).nullable().optional(),
  priceEur: z.number().nullable().optional(),
  priceChf: z.number().nullable().optional(),
  setName: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

router.get('/beys', (req, res) => {
  res.json({ ownedBeys: listOwnedBeys(req.user!.id) });
});

router.post('/beys', validateBody(ownedBeySchema), (req, res, next) => {
  try {
    const user = req.user!;
    const body = req.body as z.infer<typeof ownedBeySchema>;
    if (!getBeyById(body.beyId)) {
      res.status(404).json({ error: 'Bey not found' });
      return;
    }
    const owned = createOwnedBey({
      id: generateId(),
      userId: user.id,
      ...body,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ ownedBey: owned });
  } catch (err) {
    next(err);
  }
});

router.patch('/beys/:id', validateBody(ownedBeySchema.partial()), (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const body = req.body as z.infer<typeof ownedBeySchema>;
    if (body.beyId && !getBeyById(body.beyId)) {
      res.status(404).json({ error: 'Bey not found' });
      return;
    }
    const owned = updateOwnedBey(userId, id, body);
    if (!owned) {
      res.status(404).json({ error: 'Owned bey not found' });
      return;
    }
    res.json({ ownedBey: owned });
  } catch (err) {
    next(err);
  }
});

router.delete('/beys/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;
    const deleted = deleteOwnedBey(req.user!.id, id);
    if (!deleted) {
      res.status(404).json({ error: 'Owned bey not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const ownedPartSchema = z.object({
  partId: z.string().min(1),
  category: z.enum(['blade', 'assistBlade', 'ratchet', 'bit']),
  obtainedFrom: z.string().max(200).nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

router.get('/parts', (req, res) => {
  res.json({ ownedParts: listOwnedParts(req.user!.id) });
});

router.post('/parts', validateBody(ownedPartSchema), (req, res, next) => {
  try {
    const user = req.user!;
    const body = req.body as z.infer<typeof ownedPartSchema>;
    if (!getPartById(body.category, body.partId)) {
      res.status(404).json({ error: 'Part not found' });
      return;
    }
    const owned = createOwnedPart({
      id: generateId(),
      userId: user.id,
      ...body,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ ownedPart: owned });
  } catch (err) {
    next(err);
  }
});

router.patch('/parts/:id', validateBody(ownedPartSchema.partial()), (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const body = req.body as z.infer<typeof ownedPartSchema>;
    if (body.partId && body.category && !getPartById(body.category, body.partId)) {
      res.status(404).json({ error: 'Part not found' });
      return;
    }
    const owned = updateOwnedPart(userId, id, body);
    if (!owned) {
      res.status(404).json({ error: 'Owned part not found' });
      return;
    }
    res.json({ ownedPart: owned });
  } catch (err) {
    next(err);
  }
});

router.delete('/parts/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;
    const deleted = deleteOwnedPart(req.user!.id, id);
    if (!deleted) {
      res.status(404).json({ error: 'Owned part not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
