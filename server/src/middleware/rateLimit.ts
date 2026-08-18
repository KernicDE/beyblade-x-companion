import type { Request, Response, NextFunction } from 'express';

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface Options {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

const store = new Map<string, Bucket>();

export function rateLimit(opts: Options) {
  const windowMs = opts.windowMs;
  const maxRequests = opts.maxRequests;
  const keyGenerator = opts.keyGenerator ?? ((req: Request) => req.ip ?? 'unknown');

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    let bucket = store.get(key);
    if (!bucket) {
      bucket = { tokens: maxRequests, lastRefill: now };
      store.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((elapsed / windowMs) * maxRequests);
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    if (bucket.tokens <= 0) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    bucket.tokens--;

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, bucket.tokens)));

    if (opts.skipSuccessfulRequests) {
      const originalJson = res.json.bind(res);
      res.json = function (body: unknown): Response {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          bucket!.tokens++;
        }
        return originalJson(body);
      } as Response['json'];
    }

    next();
  };
}
