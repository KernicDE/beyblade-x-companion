import express from 'express';
import session from 'express-session';
import createSqliteStore from 'better-sqlite3-session-store';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  SESSION_SECRET,
  SESSION_MAX_AGE_MS,
  IS_PRODUCTION,
  UPLOADS_DIR,
} from './config.js';
import { getDb } from './db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import catalogRoutes from './routes/catalog.js';
import scanRoutes from './routes/scan.js';
import collectionRoutes from './routes/collection.js';
import buildsRoutes from './routes/builds.js';
import matchesRoutes from './routes/matches.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimit } from './middleware/rateLimit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SqliteStore = createSqliteStore(session);

export function createApp(): express.Application {
  const app = express();

  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(rateLimit({ windowMs: 60 * 1000, maxRequests: 120 }));

  app.use(express.json());

  app.use(
    session({
      store: new SqliteStore({
        client: getDb(),
        expired: {
          clear: true,
          intervalMs: 15 * 60 * 1000,
        },
      }),
      name: 'sid',
      secret: SESSION_SECRET as string,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: SESSION_MAX_AGE_MS,
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'strict',
      },
    })
  );

  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', catalogRoutes);
  app.use('/api/scan', scanRoutes);
  app.use('/api/collection', collectionRoutes);
  app.use('/api/builds', buildsRoutes);
  app.use('/api/matches', matchesRoutes);

  const distPath = join(__dirname, '../../dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
