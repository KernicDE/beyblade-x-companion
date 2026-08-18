const Database = require('better-sqlite3');
const fs = require('fs');
const { randomUUID } = require('crypto');

function usage() {
  console.error('Usage: node migrate-profile.cjs <profile.json> <username> <database.sqlite>');
  process.exit(1);
}

const [profilePath, username, dbPath] = process.argv.slice(2);
if (!profilePath || !username || !dbPath) usage();

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
const db = new Database(dbPath);

db.pragma('foreign_keys = OFF');

const user = db.prepare('SELECT id, role FROM users WHERE username = ? COLLATE NOCASE').get(username);
if (!user) {
  console.error(`User "${username}" not found.`);
  process.exit(1);
}

const userId = user.id;
const countsInStats = user.role === 'Rookie Blader' ? 0 : 1;
const now = new Date().toISOString();

const insertOwnedBey = db.prepare(`
  INSERT INTO owned_beys (id, userId, beyId, purchaseDate, shop, priceEur, priceChf, setName, note, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertOwnedPart = db.prepare(`
  INSERT INTO owned_parts (id, userId, partId, category, obtainedFrom, purchaseDate, note, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertBuild = db.prepare(`
  INSERT INTO builds (id, userId, name, note, bladeId, assistBladeId, ratchetId, bitId, isPublic, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMatch = db.prepare(`
  INSERT INTO matches (id, userId, date, myBeySource, myBeyId, opponentName, opponentBeyId, opponentCombo, result, finishType, note, countsInStats, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const migrate = db.transaction(() => {
  for (const bey of profile.ownedBeys || []) {
    insertOwnedBey.run(
      bey.id || randomUUID(),
      userId,
      bey.beyId,
      bey.purchaseDate ?? null,
      bey.shop ?? null,
      bey.priceEur ?? null,
      bey.priceChf ?? null,
      bey.setName ?? null,
      bey.note ?? null,
      now,
      now
    );
  }

  for (const part of profile.ownedParts || []) {
    insertOwnedPart.run(
      randomUUID(),
      userId,
      part.partId,
      part.category,
      part.obtainedFrom ?? null,
      part.purchaseDate ?? null,
      part.note ?? null,
      now,
      now
    );
  }

  for (const build of profile.builds || []) {
    insertBuild.run(
      build.id || randomUUID(),
      userId,
      build.name,
      build.note ?? null,
      build.bladeId,
      build.assistBladeId ?? null,
      build.ratchetId,
      build.bitId,
      build.isPublic ? 1 : 0,
      build.createdAt ?? now,
      build.updatedAt ?? now
    );
  }

  for (const match of profile.matches || []) {
    const myBeySource = match.myBey?.source === 'ownedBey' ? 'ownedBey' : match.myBey?.source === 'bey' ? 'bey' : 'build';
    const myBeyId =
      match.myBey?.source === 'bey'
        ? match.myBey.beyId
        : match.myBey?.source === 'ownedBey'
          ? match.myBey.ownedBeyId
          : match.myBey?.creationId;
    insertMatch.run(
      match.id || randomUUID(),
      userId,
      match.date,
      myBeySource,
      myBeyId,
      match.opponent?.name ?? '',
      match.opponent?.beyId ?? null,
      match.opponent?.combo ? JSON.stringify(match.opponent.combo) : null,
      match.result,
      match.finishType ?? null,
      match.note ?? null,
      match.countsInStats ?? countsInStats,
      now,
      now
    );
  }
});

migrate();
db.close();
console.log('Migration complete.');
