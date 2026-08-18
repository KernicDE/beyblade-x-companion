import { Router } from 'express';
import { z } from 'zod';
import { getBarcodeByCode, createBeyBarcode, getBeyById } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validate.js';
import { generateId } from '../utils/id.js';
import type { User } from '../types/index.js';

function canManageBarcodes(user: User, beyId: string): boolean {
  if (user.role === 'Council' || user.role === 'Referee') return true;
  const bey = getBeyById(beyId);
  return !!bey && bey.suggestedBy === user.id;
}

const router = Router();

const lookupSchema = z.object({
  code: z.string().trim().min(1),
  format: z.string().trim().optional(),
});

router.post('/lookup', validateBody(lookupSchema), (req, res, next) => {
  try {
    const { code, format } = req.body as z.infer<typeof lookupSchema>;
    const normalized = code.trim();
    const result = getBarcodeByCode(normalized);
    if (!result) {
      res.status(404).json({ error: 'Barcode not found' });
      return;
    }
    res.json({ barcode: result });
  } catch (err) {
    next(err);
  }
});

const createBarcodeSchema = z.object({
  code: z.string().trim().min(1),
  format: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  beyId: z.string().min(1),
  source: z.string().trim().optional(),
});

router.post(
  '/barcodes',
  requireAuth,
  validateBody(createBarcodeSchema),
  (req, res, next) => {
    try {
      const { code, format, manufacturer, beyId, source } = req.body as z.infer<typeof createBarcodeSchema>;
      if (!getBeyById(beyId)) {
        res.status(404).json({ error: 'Bey not found' });
        return;
      }
      if (!canManageBarcodes(req.user!, beyId)) {
        res.status(403).json({ error: 'Not authorized to manage barcodes for this Bey' });
        return;
      }
      const existing = getBarcodeByCode(code.trim());
      if (existing) {
        res.status(409).json({ error: 'Barcode already exists' });
        return;
      }
      const barcode = createBeyBarcode({
        id: generateId(),
        code: code.trim(),
        format,
        manufacturer,
        beyId,
        source,
        createdBy: req.user!.id,
        createdAt: new Date().toISOString(),
      });
      res.status(201).json({ barcode });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
