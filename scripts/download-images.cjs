const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const IMAGE_DIR = path.join(__dirname, '..', 'public', 'images');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const file = fs.createWriteStream(dest);
    client
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Status ${response.statusCode} for ${url}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', reject);
  });
}

function extFromUrl(url) {
  const pathname = new URL(url).pathname;
  const base = path.basename(pathname);
  const ext = path.extname(base).toLowerCase();
  if (ext === '.jpeg') return '.jpg';
  if (['.png', '.jpg', '.webp', '.gif'].includes(ext)) return ext;
  return '.png';
}

async function processFile(fileName, category) {
  const filePath = path.join(DATA_DIR, fileName);
  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const outDir = path.join(IMAGE_DIR, category);
  ensureDir(outDir);

  for (const item of items) {
    const url = item.imageUrl;
    if (!url || url.startsWith('/images/')) continue;

    const ext = extFromUrl(url);
    const safeName = item.id.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const dest = path.join(outDir, `${safeName}${ext}`);
    const publicPath = `/images/${category}/${safeName}${ext}`;

    try {
      if (!fs.existsSync(dest)) {
        console.log(`Downloading ${category}/${safeName}${ext}`);
        await download(url, dest);
      } else {
        console.log(`Exists ${category}/${safeName}${ext}`);
      }
      item.imageUrl = publicPath;
    } catch (err) {
      console.error(`Failed ${category}/${safeName}: ${err.message}`);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(items, null, 2) + '\n');
}

async function main() {
  ensureDir(IMAGE_DIR);
  await processFile('blades.json', 'blades');
  await processFile('assistBlades.json', 'assist-blades');
  await processFile('ratchets.json', 'ratchets');
  await processFile('bits.json', 'bits');
  await processFile('launchers.json', 'launchers');
  await processFile('beys.json', 'beys');
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
