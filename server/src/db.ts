import Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DATABASE_PATH } from './config.js';
import type { Role, User } from './types/index.js';

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
