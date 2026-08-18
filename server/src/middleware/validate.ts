import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, z } from 'zod';

export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid input', issues: result.error.flatten() });
      return;
    }
    (req as Request & { body: z.infer<T> }).body = result.data;
    next();
  };
}
