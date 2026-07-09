const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../public/data');
const IMAGE_CACHE_FILE = path.join(__dirname, '../.tmp/image-cache.json');

const files = {
  blades: 'blades.json',
  assistBlades: 'assistBlades.json',
  ratchets: 'ratchets.json',
  bits: 'bits.json',
  launchers: 'launchers.json',
  beys: 'beys.json',
};

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function fandomUrl(filename) {
  const hash = md5(filename);
  return `https://static.wikia.nocookie.net/beyblade/images/${hash[0]}/${hash.slice(0, 2)}/${filename}/revision/latest`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[name]), 'utf8'));
}

function saveJson(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, files[name]), JSON.stringify(data, null, 2));
}

function loadCache() {
  if (fs.existsSync(IMAGE_CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(IMAGE_CACHE_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(IMAGE_CACHE_FILE), { recursive: true });
  fs.writeFileSync(IMAGE_CACHE_FILE, JSON.stringify(cache, null, 2));
}

const JUNK_WORDS = ["'s", 'battles', 'flashback', 'crash', 'centralized', 'prototype', 'packaging', 'qr_code', 'info', 'angled', 'manga', 'anime', 'box'];
function isJunk(name) {
  const c = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return JUNK_WORDS.some((j) => c.includes(j.replace(/[^a-z0-9]/g, '')));
}

function words(name) {
  return name.replace(/[^a-zA-Z0-9]+/g, ' ').split(' ').filter(Boolean);
}

function candidateScore(itemName, candidateName, manufacturer, expectedPrefix = '') {
  const c = candidateName.toLowerCase();
  const ws = words(itemName).map((w) => w.toLowerCase());
  let score = 0;
  for (const w of ws) if (c.includes(w)) score += 10;
  if (expectedPrefix && c.startsWith(expectedPrefix.toLowerCase())) score += 30;
  if (/\.png$/i.test(candidateName)) score += 3;
  if (/\.jpeg$/i.test(candidateName) || /\.jpg$/i.test(candidateName)) score += 2;
  if (isJunk(candidateName)) score -= 100;
  const isHasbro = manufacturer === 'Hasbro';
  if (isHasbro && /hasbro/i.test(c)) score += 15;
  if (!isHasbro && /hasbro/i.test(c)) score -= 10;
  return score;
}

async function fetchPageImages(title) {
  const url = `https://beyblade.fandom.com/api.php?action=parse&page=${encodeURIComponent(title)}&prop=images&format=json`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'beyblade-x-companion/1.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.parse?.images || [])
      .filter((name) => /\.(png|jpe?g)$/i.test(name))
      .map((name) => ({ name }));
  } catch {
    return [];
  }
}

async function findBestImage(itemName, manufacturer, options) {
  const cacheKey = `${manufacturer}:${itemName}`;
  const cache = loadCache();
  if (cache[cacheKey] !== undefined) return cache[cacheKey];

  const { pageTitles = [], expectedPrefix = '' } = options;
  const all = [];
  for (const title of pageTitles) {
    const imgs = await fetchPageImages(title);
    all.push(...imgs);
    await sleep(150);
  }
  const byName = new Map();
  for (const img of all) {
    if (!byName.has(img.name)) byName.set(img.name, img);
  }
  const candidates = Array.from(byName.values()).filter((img) => !isJunk(img.name));
  if (candidates.length === 0) {
    cache[cacheKey] = '';
    saveCache(cache);
    return '';
  }
  candidates.sort((a, b) => candidateScore(itemName, b.name, manufacturer, expectedPrefix) - candidateScore(itemName, a.name, manufacturer, expectedPrefix));
  const best = candidates[0].name;
  cache[cacheKey] = best;
  saveCache(cache);
  return best;
}


async function fillPartImages() {
  const blades = loadJson('blades');
  for (const b of blades) {
    if (b.imageUrl) continue;
    const displayName = b.name === 'Disc Ball' ? 'Disk Ball' : b.name;
    const filename = await findBestImage(displayName, b.manufacturer, {
      pageTitles: [`Blade - ${displayName}`],
      expectedPrefix: 'Blade',
    });
    if (filename) b.imageUrl = fandomUrl(filename);
  }
  saveJson('blades', blades);

  const assistBlades = loadJson('assistBlades');
  for (const b of assistBlades) {
    if (b.imageUrl) continue;
    const filename = await findBestImage(b.name, b.manufacturer, {
      pageTitles: [`Assist Blade - ${b.name}`],
      expectedPrefix: 'AssistBlade',
    });
    if (filename) b.imageUrl = fandomUrl(filename);
  }
  saveJson('assistBlades', assistBlades);

  const ratchets = loadJson('ratchets');
  for (const r of ratchets) {
    if (r.imageUrl) continue;
    const filename = await findBestImage(r.name, r.manufacturer, {
      pageTitles: [`Ratchet - ${r.name}`],
      expectedPrefix: 'Ratchet',
    });
    if (filename) r.imageUrl = fandomUrl(filename);
  }
  saveJson('ratchets', ratchets);

  const bits = loadJson('bits');
  for (const b of bits) {
    if (b.imageUrl) continue;
    const filename = await findBestImage(b.name, b.manufacturer, {
      pageTitles: [`Bit - ${b.name}`],
      expectedPrefix: 'Bit',
    });
    if (filename) b.imageUrl = fandomUrl(filename);
  }
  saveJson('bits', bits);

  const launchers = loadJson('launchers');
  for (const l of launchers) {
    if (l.imageUrl) continue;
    const filename = await findBestImage(l.name, l.manufacturer, {
      pageTitles: [l.name],
    });
    if (filename) l.imageUrl = fandomUrl(filename);
  }
  saveJson('launchers', launchers);
}

async function fillBeyImages() {
  const beys = loadJson('beys');
  const blades = loadJson('blades');
  const bladeMap = new Map(blades.map((b) => [b.id, b]));
  for (const bey of beys) {
    if (bey.imageUrl) continue;
    const pageTitles = [bey.name];
    const blade = bladeMap.get(bey.bladeId);
    if (blade) {
      pageTitles.push(`${blade.name} ${bey.releaseWave}`);
    }
    const filename = await findBestImage(bey.name, bey.manufacturer, { pageTitles });
    if (filename) bey.imageUrl = fandomUrl(filename);
  }
  saveJson('beys', beys);
}

async function main() {
  console.log('Filling part images...');
  await fillPartImages();
  console.log('Filling bey images...');
  await fillBeyImages();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
