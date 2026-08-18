import type { Request, Response, NextFunction } from 'express';
import { getUserById } from '../db.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = getUserById(userId);
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: 'Account banned', reason: user.banReason });
    return;
  }

  req.user = user;
  next();
}
