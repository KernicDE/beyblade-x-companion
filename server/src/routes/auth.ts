import { Router } from 'express';
import { z } from 'zod';
import {
  createUser,
  getUserByUsername,
  updatePassword,
  setTotpSecret,
  enableTotp,
  disableTotp,
} from '../db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { toPublicUser } from '../utils/user.js';
import { generateId } from '../utils/id.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { createAuditLog } from '../db.js';
import { generateSecret, generateRecoveryCodes, getAuthenticatorUri, verifyTotp } from '../utils/totp.js';

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
  totpCode: z.string().length(6).optional(),
});

router.post('/login', authRateLimit, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { username, password, totpCode } = req.body as z.infer<typeof loginSchema>;

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

    if (user.totpEnabled) {
      if (!totpCode || !user.totpSecret || !verifyTotp(user.totpSecret, totpCode)) {
        res.status(401).json({ error: 'Invalid or missing TOTP code' });
        return;
      }
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

const totpCodeSchema = z.object({
  code: z.string().length(6),
});

router.get('/totp/status', requireAuth, (req, res) => {
  res.json({ enabled: req.user!.totpEnabled === 1 });
});

router.post('/totp/setup', requireAuth, (req, res, next) => {
  try {
    const user = req.user!;
    const secret = generateSecret();
    const recoveryCodes = generateRecoveryCodes();
    setTotpSecret(user.id, secret, recoveryCodes);
    createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'totp_setup',
      targetType: 'user',
      targetId: user.id,
      createdAt: new Date().toISOString(),
    });
    res.json({
      secret,
      uri: getAuthenticatorUri(user.username, secret),
      recoveryCodes,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/totp/verify', requireAuth, validateBody(totpCodeSchema), (req, res, next) => {
  try {
    const user = req.user!;
    const { code } = req.body as z.infer<typeof totpCodeSchema>;
    if (!user.totpSecret) {
      res.status(400).json({ error: 'TOTP not set up' });
      return;
    }
    if (!verifyTotp(user.totpSecret, code)) {
      res.status(400).json({ error: 'Invalid TOTP code' });
      return;
    }
    enableTotp(user.id);
    createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'totp_enable',
      targetType: 'user',
      targetId: user.id,
      createdAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const disableTotpSchema = z.object({
  password: z.string().min(1),
});

router.post('/totp/disable', requireAuth, validateBody(disableTotpSchema), async (req, res, next) => {
  try {
    const user = req.user!;
    const { password } = req.body as z.infer<typeof disableTotpSchema>;
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Current password incorrect' });
      return;
    }
    disableTotp(user.id);
    createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'totp_disable',
      targetType: 'user',
      targetId: user.id,
      createdAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
