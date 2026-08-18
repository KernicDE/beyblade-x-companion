import Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DATABASE_PATH } from './config.js';
import { generateId } from './utils/id.js';
import type {
  Role,
  User,
  Part,
  Bey,
  PartRating,
  BeyRating,
  BeyBarcode,
  OwnedBey,
  OwnedPart,
  Build,
  Match,
  PartCategory,
  FinishType,
  Comment,
  LocalizedString,
  OfficialStats,
  Ratings,
  BeyHighlights,
} from './types/index.js';

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

export function setTotpSecret(
  userId: string,
  secret: string,
  recoveryCodes: string[]
): void {
  const database = getDb();
  const now = new Date().toISOString();
  database
    .prepare('UPDATE users SET totpSecret = ?, totpRecoveryCodes = ?, totpEnabled = 0, updatedAt = ? WHERE id = ?')
    .run(secret, JSON.stringify(recoveryCodes), now, userId);
}

export function enableTotp(userId: string): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.prepare('UPDATE users SET totpEnabled = 1, updatedAt = ? WHERE id = ?').run(now, userId);
}

export function disableTotp(userId: string): void {
  const database = getDb();
  const now = new Date().toISOString();
  database
    .prepare('UPDATE users SET totpSecret = NULL, totpEnabled = 0, totpRecoveryCodes = NULL, updatedAt = ? WHERE id = ?')
    .run(now, userId);
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

export function listOwnedBeys(userId: string): OwnedBey[] {
  const database = getDb();
  return database.prepare('SELECT * FROM owned_beys WHERE userId = ? ORDER BY createdAt DESC').all(userId) as OwnedBey[];
}

export function getOwnedBeyById(userId: string, id: string): OwnedBey | undefined {
  const database = getDb();
  return database.prepare('SELECT * FROM owned_beys WHERE userId = ? AND id = ?').get(userId, id) as OwnedBey | undefined;
}

export function createOwnedBey(input: {
  id: string;
  userId: string;
  beyId: string;
  purchaseDate?: string | null;
  shop?: string | null;
  priceEur?: number | null;
  priceChf?: number | null;
  priceUsd?: number | null;
  setName?: string | null;
  note?: string | null;
  createdAt: string;
}): OwnedBey {
  const database = getDb();
  const now = input.createdAt;
  database
    .prepare(
      `INSERT INTO owned_beys (id, userId, beyId, purchaseDate, shop, priceEur, priceChf, priceUsd, setName, note, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.userId,
      input.beyId,
      input.purchaseDate ?? null,
      input.shop ?? null,
      input.priceEur ?? null,
      input.priceChf ?? null,
      input.priceUsd ?? null,
      input.setName ?? null,
      input.note ?? null,
      now,
      now
    );
  return getOwnedBeyById(input.userId, input.id)!;
}

export function updateOwnedBey(
  userId: string,
  id: string,
  input: {
    beyId?: string;
    purchaseDate?: string | null;
    shop?: string | null;
    priceEur?: number | null;
    priceChf?: number | null;
    priceUsd?: number | null;
    setName?: string | null;
    note?: string | null;
  }
): OwnedBey | undefined {
  const database = getDb();
  const existing = getOwnedBeyById(userId, id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  database
    .prepare(
      `UPDATE owned_beys SET
        beyId = ?, purchaseDate = ?, shop = ?, priceEur = ?, priceChf = ?, priceUsd = ?, setName = ?, note = ?, updatedAt = ?
       WHERE userId = ? AND id = ?`
    )
    .run(
      input.beyId ?? existing.beyId,
      input.purchaseDate !== undefined ? input.purchaseDate : existing.purchaseDate,
      input.shop !== undefined ? input.shop : existing.shop,
      input.priceEur !== undefined ? input.priceEur : existing.priceEur,
      input.priceChf !== undefined ? input.priceChf : existing.priceChf,
      input.priceUsd !== undefined ? input.priceUsd : existing.priceUsd,
      input.setName !== undefined ? input.setName : existing.setName,
      input.note !== undefined ? input.note : existing.note,
      now,
      userId,
      id
    );
  return getOwnedBeyById(userId, id);
}

export function deleteOwnedBey(userId: string, id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM owned_beys WHERE userId = ? AND id = ?').run(userId, id);
  return result.changes > 0;
}

export function getBeyMarketPrices(currency: 'priceEur' | 'priceChf' | 'priceUsd' = 'priceEur', months = 3): Record<string, number> {
  const database = getDb();
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceIso = since.toISOString().slice(0, 10);
  const rows = database
    .prepare(
      `SELECT beyId, AVG(${currency}) AS average
       FROM owned_beys
       WHERE ${currency} IS NOT NULL AND purchaseDate IS NOT NULL AND purchaseDate >= ?
       GROUP BY beyId`
    )
    .all(sinceIso) as { beyId: string; average: number }[];
  return rows.reduce((acc, row) => {
    acc[row.beyId] = Math.round(row.average * 100) / 100;
    return acc;
  }, {} as Record<string, number>);
}

export function listOwnedParts(userId: string): OwnedPart[] {
  const database = getDb();
  return database.prepare('SELECT * FROM owned_parts WHERE userId = ? ORDER BY createdAt DESC').all(userId) as OwnedPart[];
}

export function getOwnedPartById(userId: string, id: string): OwnedPart | undefined {
  const database = getDb();
  return database.prepare('SELECT * FROM owned_parts WHERE userId = ? AND id = ?').get(userId, id) as OwnedPart | undefined;
}

export function createOwnedPart(input: {
  id: string;
  userId: string;
  partId: string;
  category: PartCategory;
  obtainedFrom?: string | null;
  purchaseDate?: string | null;
  note?: string | null;
  createdAt: string;
}): OwnedPart {
  const database = getDb();
  const now = input.createdAt;
  database
    .prepare(
      `INSERT INTO owned_parts (id, userId, partId, category, obtainedFrom, purchaseDate, note, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.userId,
      input.partId,
      input.category,
      input.obtainedFrom ?? null,
      input.purchaseDate ?? null,
      input.note ?? null,
      now,
      now
    );
  return getOwnedPartById(input.userId, input.id)!;
}

export function updateOwnedPart(
  userId: string,
  id: string,
  input: {
    partId?: string;
    category?: PartCategory;
    obtainedFrom?: string | null;
    purchaseDate?: string | null;
    note?: string | null;
  }
): OwnedPart | undefined {
  const database = getDb();
  const existing = getOwnedPartById(userId, id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  database
    .prepare(
      `UPDATE owned_parts SET
        partId = ?, category = ?, obtainedFrom = ?, purchaseDate = ?, note = ?, updatedAt = ?
       WHERE userId = ? AND id = ?`
    )
    .run(
      input.partId ?? existing.partId,
      input.category ?? existing.category,
      input.obtainedFrom !== undefined ? input.obtainedFrom : existing.obtainedFrom,
      input.purchaseDate !== undefined ? input.purchaseDate : existing.purchaseDate,
      input.note !== undefined ? input.note : existing.note,
      now,
      userId,
      id
    );
  return getOwnedPartById(userId, id);
}

export function deleteOwnedPart(userId: string, id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM owned_parts WHERE userId = ? AND id = ?').run(userId, id);
  return result.changes > 0;
}

export function listBuilds(userId: string, opts?: { includePublic?: boolean }): Build[] {
  const database = getDb();
  if (opts?.includePublic) {
    return database
      .prepare('SELECT * FROM builds WHERE userId = ? OR isPublic = 1 ORDER BY updatedAt DESC')
      .all(userId) as Build[];
  }
  return database.prepare('SELECT * FROM builds WHERE userId = ? ORDER BY updatedAt DESC').all(userId) as Build[];
}

export function getBuildById(userId: string, id: string): Build | undefined {
  const database = getDb();
  return database
    .prepare('SELECT * FROM builds WHERE id = ? AND (userId = ? OR isPublic = 1)')
    .get(id, userId) as Build | undefined;
}

export function createBuild(input: {
  id: string;
  userId: string;
  name: string;
  note?: string | null;
  bladeId: string;
  assistBladeId?: string | null;
  ratchetId: string;
  bitId: string;
  isPublic?: boolean;
  createdAt: string;
}): Build {
  const database = getDb();
  const now = input.createdAt;
  database
    .prepare(
      `INSERT INTO builds (id, userId, name, note, bladeId, assistBladeId, ratchetId, bitId, isPublic, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.userId,
      input.name,
      input.note ?? null,
      input.bladeId,
      input.assistBladeId ?? null,
      input.ratchetId,
      input.bitId,
      input.isPublic ? 1 : 0,
      now,
      now
    );
  return getBuildById(input.userId, input.id)!;
}

export function updateBuild(
  userId: string,
  id: string,
  input: {
    name?: string;
    note?: string | null;
    bladeId?: string;
    assistBladeId?: string | null;
    ratchetId?: string;
    bitId?: string;
    isPublic?: boolean;
  }
): Build | undefined {
  const database = getDb();
  const existing = database.prepare('SELECT * FROM builds WHERE userId = ? AND id = ?').get(userId, id) as Build | undefined;
  if (!existing) return undefined;
  const now = new Date().toISOString();
  database
    .prepare(
      `UPDATE builds SET
        name = ?, note = ?, bladeId = ?, assistBladeId = ?, ratchetId = ?, bitId = ?, isPublic = ?, updatedAt = ?
       WHERE userId = ? AND id = ?`
    )
    .run(
      input.name ?? existing.name,
      input.note !== undefined ? input.note : existing.note,
      input.bladeId ?? existing.bladeId,
      input.assistBladeId !== undefined ? input.assistBladeId : existing.assistBladeId,
      input.ratchetId ?? existing.ratchetId,
      input.bitId ?? existing.bitId,
      input.isPublic !== undefined ? (input.isPublic ? 1 : 0) : existing.isPublic,
      now,
      userId,
      id
    );
  return getBuildById(userId, id);
}

export function deleteBuild(userId: string, id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM builds WHERE userId = ? AND id = ?').run(userId, id);
  return result.changes > 0;
}

function matchCountsInStats(role: Role): number {
  return role === 'Blader' || role === 'Referee' || role === 'Council' ? 1 : 0;
}

export function listMatches(userId: string): Match[] {
  const database = getDb();
  return database.prepare('SELECT * FROM matches WHERE userId = ? ORDER BY date DESC, createdAt DESC').all(userId) as Match[];
}

export function getMatchById(userId: string, id: string): Match | undefined {
  const database = getDb();
  return database.prepare('SELECT * FROM matches WHERE userId = ? AND id = ?').get(userId, id) as Match | undefined;
}

export function createMatch(
  input: {
    id: string;
    userId: string;
    date: string;
    myBeySource: 'bey' | 'ownedBey' | 'build';
    myBeyId: string;
    opponentName: string;
    opponentBeyId?: string | null;
    opponentCombo?: string | null;
    result: 'win' | 'loss';
    finishType?: FinishType | null;
    note?: string | null;
    createdAt: string;
  },
  role: Role
): Match {
  const database = getDb();
  const now = input.createdAt;
  const countsInStats = matchCountsInStats(role);
  database
    .prepare(
      `INSERT INTO matches (id, userId, date, myBeySource, myBeyId, opponentName, opponentBeyId, opponentCombo, result, finishType, note, countsInStats, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.userId,
      input.date,
      input.myBeySource,
      input.myBeyId,
      input.opponentName,
      input.opponentBeyId ?? null,
      input.opponentCombo ?? null,
      input.result,
      input.finishType ?? null,
      input.note ?? null,
      countsInStats,
      now,
      now
    );
  return getMatchById(input.userId, input.id)!;
}

export function updateMatch(
  userId: string,
  id: string,
  input: {
    date?: string;
    myBeySource?: 'bey' | 'ownedBey' | 'build';
    myBeyId?: string;
    opponentName?: string;
    opponentBeyId?: string | null;
    opponentCombo?: string | null;
    result?: 'win' | 'loss';
    finishType?: FinishType | null;
    note?: string | null;
  },
  role: Role
): Match | undefined {
  const database = getDb();
  const existing = getMatchById(userId, id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  const countsInStats = matchCountsInStats(role);
  database
    .prepare(
      `UPDATE matches SET
        date = ?, myBeySource = ?, myBeyId = ?, opponentName = ?, opponentBeyId = ?, opponentCombo = ?, result = ?, finishType = ?, note = ?, countsInStats = ?, updatedAt = ?
       WHERE userId = ? AND id = ?`
    )
    .run(
      input.date ?? existing.date,
      input.myBeySource ?? existing.myBeySource,
      input.myBeyId ?? existing.myBeyId,
      input.opponentName ?? existing.opponentName,
      input.opponentBeyId !== undefined ? input.opponentBeyId : existing.opponentBeyId,
      input.opponentCombo !== undefined ? input.opponentCombo : existing.opponentCombo,
      input.result ?? existing.result,
      input.finishType !== undefined ? input.finishType : existing.finishType,
      input.note !== undefined ? input.note : existing.note,
      countsInStats,
      now,
      userId,
      id
    );
  return getMatchById(userId, id);
}

export function deleteMatch(userId: string, id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM matches WHERE userId = ? AND id = ?').run(userId, id);
  return result.changes > 0;
}


export function listComments(targetType: 'bey' | 'part', targetId: string): (Comment & { username: string })[] {
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT c.*, u.username
       FROM comments c
       JOIN users u ON u.id = c.userId
       WHERE c.targetType = ? AND c.targetId = ? AND c.deletedAt IS NULL
       ORDER BY c.createdAt DESC`
    )
    .all(targetType, targetId) as (Comment & { username: string })[];
  return rows;
}

function getCommentWithUsername(id: string): (Comment & { username: string }) | undefined {
  const database = getDb();
  return database
    .prepare(
      `SELECT c.*, u.username
       FROM comments c
       JOIN users u ON u.id = c.userId
       WHERE c.id = ?`
    )
    .get(id) as (Comment & { username: string }) | undefined;
}

export function createComment(input: {
  id: string;
  userId: string;
  targetType: 'bey' | 'part';
  targetId: string;
  text: string;
  createdAt: string;
}): Comment & { username: string } {
  const database = getDb();
  const now = input.createdAt;
  database
    .prepare(
      `INSERT INTO comments (id, userId, targetType, targetId, text, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(input.id, input.userId, input.targetType, input.targetId, input.text, now, now);
  return getCommentWithUsername(input.id)!;
}

export function deleteComment(id: string, deletedBy: string): boolean {
  const database = getDb();
  const now = new Date().toISOString();
  const result = database
    .prepare('UPDATE comments SET deletedAt = ?, deletedBy = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL')
    .run(now, deletedBy, now, id);
  return result.changes > 0;
}

export function getCommentById(id: string): Comment | undefined {
  const database = getDb();
  return database.prepare('SELECT * FROM comments WHERE id = ?').get(id) as Comment | undefined;
}

function getRawPartById(id: string): Part | undefined {
  const database = getDb();
  const row = database.prepare('SELECT * FROM parts WHERE id = ?').get(id);
  if (!row) return undefined;
  return parsePart(row as Record<string, unknown>);
}

function getRawBeyById(id: string): Bey | undefined {
  const database = getDb();
  const row = database.prepare('SELECT * FROM beys WHERE id = ?').get(id);
  if (!row) return undefined;
  return parseBey(row as Record<string, unknown>);
}

export function createPartSuggestion(input: {
  id: string;
  category: PartCategory;
  name: string;
  manufacturer?: 'Takara Tomy' | 'Hasbro' | null;
  imageUrl?: string | null;
  releaseDate?: string | null;
  releaseWave?: string | null;
  description?: LocalizedString | null;
  assessment?: LocalizedString | null;
  officialStats?: OfficialStats | null;
  baselineRatings?: Ratings | null;
  customLine?: number;
  suggestedBy: string;
  createdAt: string;
}): Part {
  const database = getDb();
  const now = input.createdAt;
  database
    .prepare(
      `INSERT INTO parts (
        id, category, name, manufacturer, imageUrl, releaseDate, releaseWave,
        description, assessment, officialStats, ratingsSource, tier, customLine,
        baselineRatings, status, suggestedBy, moderatorNote, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.category,
      input.name,
      input.manufacturer ?? null,
      input.imageUrl ?? null,
      input.releaseDate ?? null,
      input.releaseWave ?? null,
      input.description ? JSON.stringify(input.description) : null,
      input.assessment ? JSON.stringify(input.assessment) : null,
      input.officialStats ? JSON.stringify(input.officialStats) : null,
      null,
      null,
      input.customLine ?? 0,
      input.baselineRatings ? JSON.stringify(input.baselineRatings) : null,
      'pending',
      input.suggestedBy,
      null,
      now,
      now
    );
  return getRawPartById(input.id)!;
}

export function createBeySuggestion(input: {
  id: string;
  name: string;
  manufacturer?: 'Takara Tomy' | 'Hasbro' | null;
  imageUrl?: string | null;
  releaseDate?: string | null;
  releaseWave?: string | null;
  priceJpy?: number | null;
  priceUsd?: number | null;
  priceEur?: number | null;
  bladeId: string;
  assistBladeId?: string | null;
  ratchetId: string;
  bitId: string;
  assessment?: LocalizedString | null;
  highlights?: BeyHighlights | null;
  suggestedBy: string;
  createdAt: string;
}): Bey {
  const database = getDb();
  const now = input.createdAt;
  database
    .prepare(
      `INSERT INTO beys (
        id, name, manufacturer, imageUrl, releaseDate, releaseWave,
        priceJpy, priceUsd, priceEur, bladeId, assistBladeId, ratchetId, bitId,
        assessment, highlights, status, suggestedBy, moderatorNote, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.name,
      input.manufacturer ?? null,
      input.imageUrl ?? null,
      input.releaseDate ?? null,
      input.releaseWave ?? null,
      input.priceJpy ?? null,
      input.priceUsd ?? null,
      input.priceEur ?? null,
      input.bladeId,
      input.assistBladeId ?? null,
      input.ratchetId,
      input.bitId,
      input.assessment ? JSON.stringify(input.assessment) : null,
      input.highlights ? JSON.stringify(input.highlights) : null,
      'pending',
      input.suggestedBy,
      null,
      now,
      now
    );
  return getRawBeyById(input.id)!;
}

export function listPendingParts(): Part[] {
  const database = getDb();
  const rows = database.prepare("SELECT * FROM parts WHERE status = 'pending' ORDER BY createdAt DESC").all();
  return rows.map(parsePart);
}

export function listPendingBeys(): Bey[] {
  const database = getDb();
  const rows = database.prepare("SELECT * FROM beys WHERE status = 'pending' ORDER BY createdAt DESC").all();
  return rows.map(parseBey);
}

export function approvePart(
  id: string,
  moderatorNote?: string | null,
  approvedBy?: string | null,
  approvedAt?: string | null
): Part | undefined {
  const database = getDb();
  const existing = getRawPartById(id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  database
    .prepare('UPDATE parts SET status = ?, moderatorNote = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ?')
    .run('approved', moderatorNote ?? null, approvedBy ?? null, approvedAt ?? now, now, id);
  return getRawPartById(id);
}

export function rejectPart(id: string, moderatorNote?: string | null): Part | undefined {
  const database = getDb();
  const existing = getRawPartById(id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  database
    .prepare('UPDATE parts SET status = ?, moderatorNote = ?, updatedAt = ? WHERE id = ?')
    .run('rejected', moderatorNote ?? null, now, id);
  return getRawPartById(id);
}

export function approveBey(
  id: string,
  moderatorNote?: string | null,
  approvedBy?: string | null,
  approvedAt?: string | null
): Bey | undefined {
  const database = getDb();
  const existing = getRawBeyById(id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  database
    .prepare('UPDATE beys SET status = ?, moderatorNote = ?, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ?')
    .run('approved', moderatorNote ?? null, approvedBy ?? null, approvedAt ?? now, now, id);
  return getRawBeyById(id);
}

export function rejectBey(id: string, moderatorNote?: string | null): Bey | undefined {
  const database = getDb();
  const existing = getRawBeyById(id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  database
    .prepare('UPDATE beys SET status = ?, moderatorNote = ?, updatedAt = ? WHERE id = ?')
    .run('rejected', moderatorNote ?? null, now, id);
  return getRawBeyById(id);
}

export function updatePart(
  category: string,
  id: string,
  input: Partial<Omit<Part, 'id' | 'createdAt' | 'updatedAt'>>
): Part | undefined {
  const database = getDb();
  const existing = getRawPartById(id);
  if (!existing || existing.category !== category) return undefined;

  const allowedColumns = new Set([
    'category',
    'name',
    'manufacturer',
    'imageUrl',
    'releaseDate',
    'releaseWave',
    'description',
    'assessment',
    'officialStats',
    'ratingsSource',
    'tier',
    'customLine',
    'baselineRatings',
    'status',
    'suggestedBy',
    'moderatorNote',
  ]);
  const jsonFields = new Set(['description', 'assessment', 'officialStats', 'baselineRatings']);

  const entries = Object.entries(input).filter(([key]) => allowedColumns.has(key));
  if (entries.length === 0) return existing;

  const columns: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of entries) {
    columns.push(key);
    values.push(jsonFields.has(key) ? (value ? JSON.stringify(value) : null) : value);
  }

  const now = new Date().toISOString();
  database
    .prepare(`UPDATE parts SET ${columns.map((c) => `${c} = ?`).join(', ')}, updatedAt = ? WHERE id = ?`)
    .run(...values, now, id);
  return getRawPartById(id);
}

export function updateBey(
  id: string,
  input: Partial<Omit<Bey, 'id' | 'createdAt' | 'updatedAt'>>
): Bey | undefined {
  const database = getDb();
  const existing = getRawBeyById(id);
  if (!existing) return undefined;

  const allowedColumns = new Set([
    'name',
    'manufacturer',
    'imageUrl',
    'releaseDate',
    'releaseWave',
    'priceJpy',
    'priceUsd',
    'priceEur',
    'bladeId',
    'assistBladeId',
    'ratchetId',
    'bitId',
    'assessment',
    'highlights',
    'status',
    'suggestedBy',
    'moderatorNote',
  ]);
  const jsonFields = new Set(['assessment', 'highlights']);

  const entries = Object.entries(input).filter(([key]) => allowedColumns.has(key));
  if (entries.length === 0) return existing;

  const columns: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of entries) {
    columns.push(key);
    values.push(jsonFields.has(key) ? (value ? JSON.stringify(value) : null) : value);
  }

  const now = new Date().toISOString();
  database
    .prepare(`UPDATE beys SET ${columns.map((c) => `${c} = ?`).join(', ')}, updatedAt = ? WHERE id = ?`)
    .run(...values, now, id);
  return getRawBeyById(id);
}
