import { randomBytes } from 'crypto';

export const PORT = Number(process.env.PORT ?? 3000);
export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

export const DATA_DIR = process.env.DATA_DIR ?? './data';
export const DATABASE_PATH = `${DATA_DIR}/beycom.sqlite`;
export const UPLOADS_DIR = `${DATA_DIR}/uploads`;

export const SESSION_SECRET =
  process.env.SESSION_SECRET ??
  (IS_PRODUCTION ? undefined : randomBytes(32).toString('hex'));

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required in production');
}

export const SESSION_MAX_AGE_MS = Number(
  process.env.SESSION_MAX_AGE_MS ?? 24 * 60 * 60 * 1000
);

export const BCRYPT_ROUNDS = 12;
