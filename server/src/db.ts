import Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DATABASE_PATH } from './config.js';
import { generateId } from './utils/id.js';
import type { Role, User, Part, Bey, PartRating, BeyRating, BeyBarcode } from './types/index.js';

export type { User, Role };

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DATABASE_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export async function migrate(migrationsDir: string): Promise<void> {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      appliedAt TEXT NOT NULL
    );
  `);

  const appliedRows = database.prepare('SELECT name FROM _migrations').all() as { name: string }[];
  const applied = new Set(appliedRows.map((r) => r.name));

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    const appliedAt = new Date().toISOString();
    database.transaction(() => {
      database.exec(sql);
      database.prepare('INSERT INTO _migrations (name, appliedAt) VALUES (?, ?)').run(file, appliedAt);
    })();
  }
}

export function createUser(input: {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string;
  role?: Role;
  createdAt: string;
}): User {
  const database = getDb();
  const now = input.createdAt;
  const role = input.role ?? 'Rookie Blader';
  database
    .prepare(
      `INSERT INTO users (
        id, username, email, passwordHash, role, isBanned, totpEnabled, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)`
    )
    .run(input.id, input.username, input.email, input.passwordHash, role, now, now);
  return getUserById(input.id)!;
}

export function getUserById(id: string): User | undefined {
  const database = getDb();
  return database.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUserByUsername(username: string): User | undefined {
  const database = getDb();
  return database.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) as
    | User
    | undefined;
}

export function updatePassword(userId: string, passwordHash: string): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?').run(passwordHash, now, userId);
}

export function listUsers(): User[] {
  const database = getDb();
  return database.prepare('SELECT * FROM users ORDER BY createdAt DESC').all() as User[];
}

export function setUserRole(userId: string, role: Role): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.prepare('UPDATE users SET role = ?, updatedAt = ? WHERE id = ?').run(role, now, userId);
}

export function setUserBan(userId: string, isBanned: boolean, reason: string | null, bannedBy: string | null): void {
  const database = getDb();
  const now = new Date().toISOString();
  database
    .prepare(
      'UPDATE users SET isBanned = ?, banReason = ?, bannedAt = ?, bannedBy = ?, updatedAt = ? WHERE id = ?'
    )
    .run(isBanned ? 1 : 0, reason, isBanned ? now : null, bannedBy, now, userId);
}

export function promoteRatingsForUser(userId: string): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.prepare('UPDATE part_ratings SET countsInAverage = 1, updatedAt = ? WHERE userId = ?').run(now, userId);
  database.prepare('UPDATE bey_ratings SET countsInAverage = 1, updatedAt = ? WHERE userId = ?').run(now, userId);
}

export function countUserContributions(userId: string): number {
  const database = getDb();
  const ratings = database
    .prepare("SELECT COUNT(*) AS count FROM part_ratings WHERE userId = ? UNION ALL SELECT COUNT(*) FROM bey_ratings WHERE userId = ?")
    .all(userId, userId) as { count: number }[];
  const comments = database
    .prepare('SELECT COUNT(*) AS count FROM comments WHERE userId = ? AND deletedAt IS NULL')
    .get(userId) as { count: number };
  return ratings.reduce((sum, row) => sum + row.count, 0) + comments.count;
}

export function createAuditLog(input: {
  id: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}): void {
  const database = getDb();
  database
    .prepare(
      'INSERT INTO audit_log (id, actorId, action, targetType, targetId, meta, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      input.id,
      input.actorId,
      input.action,
      input.targetType ?? null,
      input.targetId ?? null,
      input.meta ? JSON.stringify(input.meta) : null,
      input.createdAt
    );
}

function parsePart(row: unknown): Part {
  const r = row as Record<string, unknown>;
  return {
    ...r,
    description: r.description ? JSON.parse(r.description as string) : null,
    assessment: r.assessment ? JSON.parse(r.assessment as string) : null,
    officialStats: r.officialStats ? JSON.parse(r.officialStats as string) : null,
    baselineRatings: r.baselineRatings ? JSON.parse(r.baselineRatings as string) : null,
  } as Part;
}

function parseBey(row: unknown): Bey {
  const r = row as Record<string, unknown>;
  return {
    ...r,
    assessment: r.assessment ? JSON.parse(r.assessment as string) : null,
    highlights: r.highlights ? JSON.parse(r.highlights as string) : null,
  } as Bey;
}

export function getCatalog(): { parts: Part[]; beys: Bey[] } {
  const database = getDb();
  const partRows = database.prepare("SELECT * FROM parts WHERE status = 'approved' ORDER BY category, name").all();
  const beyRows = database.prepare("SELECT * FROM beys WHERE status = 'approved' ORDER BY name").all();
  return {
    parts: partRows.map(parsePart),
    beys: beyRows.map(parseBey),
  };
}

export function listParts(category?: string): Part[] {
  const database = getDb();
  if (category) {
    const rows = database.prepare("SELECT * FROM parts WHERE category = ? AND status = 'approved' ORDER BY name").all(category);
    return rows.map(parsePart);
  }
  const rows = database.prepare("SELECT * FROM parts WHERE status = 'approved' ORDER BY category, name").all();
  return rows.map(parsePart);
}

export function getPartById(category: string, id: string): Part | undefined {
  const database = getDb();
  const row = database
    .prepare("SELECT * FROM parts WHERE category = ? AND id = ? AND status = 'approved'")
    .get(category, id);
  if (!row) return undefined;
  return parsePart(row as Record<string, unknown>);
}

export function listBeys(): Bey[] {
  const database = getDb();
  const rows = database.prepare("SELECT * FROM beys WHERE status = 'approved' ORDER BY name").all();
  return rows.map(parseBey);
}

export function getBeyById(id: string): Bey | undefined {
  const database = getDb();
  const row = database.prepare("SELECT * FROM beys WHERE id = ? AND status = 'approved'").get(id);
  if (!row) return undefined;
  return parseBey(row as Record<string, unknown>);
}

export function getUserPartRating(userId: string, partId: string): PartRating | undefined {
  const database = getDb();
  return database
    .prepare('SELECT * FROM part_ratings WHERE userId = ? AND partId = ?')
    .get(userId, partId) as PartRating | undefined;
}

export function getUserBeyRating(userId: string, beyId: string): BeyRating | undefined {
  const database = getDb();
  return database
    .prepare('SELECT * FROM bey_ratings WHERE userId = ? AND beyId = ?')
    .get(userId, beyId) as BeyRating | undefined;
}

export function upsertPartRating(
  userId: string,
  partId: string,
  ratings: { attack: number; defense: number; stamina: number; balance: number },
  role: Role
): PartRating {
  const database = getDb();
  const now = new Date().toISOString();
  const countsInAverage = role === 'Blader' || role === 'Council' || role === 'Referee' ? 1 : 0;
  const existing = database.prepare('SELECT id FROM part_ratings WHERE userId = ? AND partId = ?').get(userId, partId);
  if (existing) {
    database
      .prepare(
        'UPDATE part_ratings SET attack = ?, defense = ?, stamina = ?, balance = ?, countsInAverage = ?, updatedAt = ? WHERE userId = ? AND partId = ?'
      )
      .run(ratings.attack, ratings.defense, ratings.stamina, ratings.balance, countsInAverage, now, userId, partId);
  } else {
    database
      .prepare(
        'INSERT INTO part_ratings (id, userId, partId, attack, defense, stamina, balance, countsInAverage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(generateId(), userId, partId, ratings.attack, ratings.defense, ratings.stamina, ratings.balance, countsInAverage, now, now);
  }
  return getUserPartRating(userId, partId)!;
}

export function upsertBeyRating(
  userId: string,
  beyId: string,
  ratings: { attack: number; defense: number; stamina: number; balance: number },
  role: Role
): BeyRating {
  const database = getDb();
  const now = new Date().toISOString();
  const countsInAverage = role === 'Blader' || role === 'Council' || role === 'Referee' ? 1 : 0;
  const existing = database.prepare('SELECT id FROM bey_ratings WHERE userId = ? AND beyId = ?').get(userId, beyId);
  if (existing) {
    database
      .prepare(
        'UPDATE bey_ratings SET attack = ?, defense = ?, stamina = ?, balance = ?, countsInAverage = ?, updatedAt = ? WHERE userId = ? AND beyId = ?'
      )
      .run(ratings.attack, ratings.defense, ratings.stamina, ratings.balance, countsInAverage, now, userId, beyId);
  } else {
    database
      .prepare(
        'INSERT INTO bey_ratings (id, userId, beyId, attack, defense, stamina, balance, countsInAverage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(generateId(), userId, beyId, ratings.attack, ratings.defense, ratings.stamina, ratings.balance, countsInAverage, now, now);
  }
  return getUserBeyRating(userId, beyId)!;
}

export interface RatingSummary {
  attack: number;
  defense: number;
  stamina: number;
  balance: number;
  count: number;
}

export function getPartRatingSummary(partId: string): RatingSummary {
  const database = getDb();
  const row = database
    .prepare(
      'SELECT AVG(attack) AS attack, AVG(defense) AS defense, AVG(stamina) AS stamina, AVG(balance) AS balance, COUNT(*) AS count FROM part_ratings WHERE partId = ? AND countsInAverage = 1'
    )
    .get(partId) as { attack: number; defense: number; stamina: number; balance: number; count: number };
  return {
    attack: row.attack ? Math.round(row.attack * 100) / 100 : 0,
    defense: row.defense ? Math.round(row.defense * 100) / 100 : 0,
    stamina: row.stamina ? Math.round(row.stamina * 100) / 100 : 0,
    balance: row.balance ? Math.round(row.balance * 100) / 100 : 0,
    count: row.count,
  };
}

export function getBeyRatingSummary(beyId: string): RatingSummary {
  const database = getDb();
  const row = database
    .prepare(
      'SELECT AVG(attack) AS attack, AVG(defense) AS defense, AVG(stamina) AS stamina, AVG(balance) AS balance, COUNT(*) AS count FROM bey_ratings WHERE beyId = ? AND countsInAverage = 1'
    )
    .get(beyId) as { attack: number; defense: number; stamina: number; balance: number; count: number };
  return {
    attack: row.attack ? Math.round(row.attack * 100) / 100 : 0,
    defense: row.defense ? Math.round(row.defense * 100) / 100 : 0,
    stamina: row.stamina ? Math.round(row.stamina * 100) / 100 : 0,
    balance: row.balance ? Math.round(row.balance * 100) / 100 : 0,
    count: row.count,
  };
}

export function getBarcodeByCode(code: string): (BeyBarcode & { bey?: Bey }) | undefined {
  const database = getDb();
  const row = database.prepare('SELECT * FROM bey_barcodes WHERE code = ?').get(code) as BeyBarcode | undefined;
  if (!row) return undefined;
  const bey = getBeyById(row.beyId);
  return { ...row, bey };
}

export function createBeyBarcode(input: {
  id: string;
  code: string;
  format?: string;
  manufacturer?: string;
  beyId: string;
  source?: string;
  createdBy?: string;
  createdAt: string;
}): BeyBarcode {
  const database = getDb();
  database
    .prepare(
      'INSERT INTO bey_barcodes (id, code, format, manufacturer, beyId, source, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(input.id, input.code, input.format ?? null, input.manufacturer ?? null, input.beyId, input.source ?? null, input.createdBy ?? null, input.createdAt);
  return getBarcodeByCode(input.code) as BeyBarcode;
}
