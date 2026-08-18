import { Router } from 'express';
import { z } from 'zod';
import { createUser, getUserByUsername, updatePassword } from '../db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { toPublicUser } from '../utils/user.js';
import { generateId } from '../utils/id.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { createAuditLog } from '../db.js';

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => req.body?.username?.toLowerCase() ?? req.ip ?? 'unknown',
});

const router = Router();

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, underscores and hyphens'),
  email: z.string().email().nullable().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

router.post('/register', authRateLimit, validateBody(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password } = req.body as z.infer<typeof registerSchema>;

    const existing = getUserByUsername(username);
    if (existing) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = createUser({
      id: generateId(),
      username,
      email: email ?? null,
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    req.session.userId = user.id;
    createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'register',
      targetType: 'user',
      targetId: user.id,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

router.post('/login', authRateLimit, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body as z.infer<typeof loginSchema>;

    const user = getUserByUsername(username);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: 'Account banned', reason: user.banReason });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    req.session.userId = user.id;
    createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'login',
      targetType: 'user',
      targetId: user.id,
      createdAt: new Date().toISOString(),
    });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {});
  res.clearCookie('sid');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user!) });
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

router.post('/password', requireAuth, validateBody(passwordSchema), async (req, res, next) => {
  try {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body as z.infer<typeof passwordSchema>;

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Current password incorrect' });
      return;
    }

    const hash = await hashPassword(newPassword);
    updatePassword(user.id, hash);
    createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'change_password',
      targetType: 'user',
      targetId: user.id,
      createdAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
