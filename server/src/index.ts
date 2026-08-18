import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { getDb, migrate, closeDb } from './db.js';
import { seedCatalog } from './seed.js';
import { DATA_DIR, UPLOADS_DIR, PORT } from './config.js';

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOADS_DIR, { recursive: true });

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../migrations');

getDb();
await migrate(migrationsDir);
seedCatalog();

const app = createApp();
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function shutdown(): void {
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
