import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getDb } from './db.js';
import type { Bey, Part, Ratings } from './types/index.js';

interface SeedPart extends Omit<Part, 'baselineRatings' | 'ratingsSource'> {
  ratings: Ratings;
  ratingsSource?: 'community' | 'estimated';
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../public/data');

function readJson<T>(name: string): T | undefined {
  const path = join(dataDir, name);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

export function seedCatalog(): void {
  const database = getDb();
  const existingParts = database.prepare('SELECT COUNT(*) AS count FROM parts').get() as { count: number };
  const existingBeys = database.prepare('SELECT COUNT(*) AS count FROM beys').get() as { count: number };
  if (existingParts.count > 0 || existingBeys.count > 0) {
    return;
  }

  const blades = readJson<SeedPart[]>('blades.json') ?? [];
  const assistBlades = readJson<SeedPart[]>('assistBlades.json') ?? [];
  const ratchets = readJson<SeedPart[]>('ratchets.json') ?? [];
  const bits = readJson<SeedPart[]>('bits.json') ?? [];
  const beys = readJson<Bey[]>('beys.json') ?? [];

  const now = new Date().toISOString();

  const insertPart = database.prepare(
    `INSERT INTO parts (
      id, category, name, manufacturer, imageUrl, releaseDate, releaseWave,
      description, assessment, officialStats, ratingsSource, tier, customLine,
      baselineRatings, status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertBey = database.prepare(
    `INSERT INTO beys (
      id, name, manufacturer, imageUrl, releaseDate, releaseWave,
      priceJpy, priceUsd, priceEur, bladeId, assistBladeId, ratchetId, bitId,
      assessment, highlights, status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  database.transaction(() => {
    for (const part of [...blades, ...assistBlades, ...ratchets, ...bits]) {
      insertPart.run(
        part.id,
        part.category,
        part.name,
        part.manufacturer ?? null,
        part.imageUrl ?? null,
        part.releaseDate ?? null,
        part.releaseWave ?? null,
        part.description ? JSON.stringify(part.description) : null,
        part.assessment ? JSON.stringify(part.assessment) : null,
        part.officialStats ? JSON.stringify(part.officialStats) : null,
        part.ratingsSource ?? 'estimated',
        part.tier ?? null,
        part.customLine ? 1 : 0,
        part.ratings ? JSON.stringify(part.ratings) : null,
        'approved',
        now,
        now
      );
    }

    for (const bey of beys) {
      insertBey.run(
        bey.id,
        bey.name,
        bey.manufacturer ?? null,
        bey.imageUrl ?? null,
        bey.releaseDate ?? null,
        bey.releaseWave ?? null,
        bey.priceJpy ?? null,
        bey.priceUsd ?? null,
        bey.priceEur ?? null,
        bey.bladeId,
        bey.assistBladeId ?? null,
        bey.ratchetId,
        bey.bitId,
        bey.assessment ? JSON.stringify(bey.assessment) : null,
        bey.highlights ? JSON.stringify(bey.highlights) : null,
        'approved',
        now,
        now
      );
    }
  })();

  console.log(`Seeded ${blades.length + assistBlades.length + ratchets.length + bits.length} parts and ${beys.length} beys`);
}
