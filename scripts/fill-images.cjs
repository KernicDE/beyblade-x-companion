const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../public/data');
const CACHE_FILE = path.join(__dirname, '../.tmp/image-cache-v2.json');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'));
}

function saveJson(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

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

function noSpace(name) {
  return name.replace(/\s+/g, '');
}

function toTitleCamel(name) {
  return name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

async function fetchImages(prefix) {
  const url = `https://beyblade.fandom.com/api.php?action=query&list=allimages&aiprefix=${encodeURIComponent(prefix)}&ailimit=50&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'beyblade-x-companion/1.0' } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.query?.allimages || [])
    .filter((img) => /\.(png|jpe?g)$/i.test(img.name))
    .map((img) => ({ name: img.name, url: img.url }));
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

const JUNK_WORDS = ['battles', 'flashback', 'crash', 'centralized', 'prototype', 'packaging', 'qr_code', 'info', 'angled', 'manga', 'anime', 'box', 'render'];
function isJunk(name) {
  const c = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return JUNK_WORDS.some((j) => c.includes(j.replace(/[^a-z0-9]/g, '')));
}

function words(name) {
  return name.replace(/[^a-zA-Z0-9]+/g, ' ').split(' ').filter(Boolean);
}

function score(itemName, candidateName, manufacturer, expectedPrefix) {
  const c = candidateName.toLowerCase();
  const ws = words(itemName).map((w) => w.toLowerCase());
  let s = 0;
  for (const w of ws) if (c.includes(w)) s += 10;
  if (expectedPrefix && c.startsWith(expectedPrefix.toLowerCase())) s += 30;
  if (/\.png$/i.test(candidateName)) s += 3;
  if (/\.(jpeg|jpg)$/i.test(candidateName)) s += 2;
  if (isJunk(candidateName)) s -= 100;
  const isHasbro = manufacturer === 'Hasbro';
  if (isHasbro && /hasbro/i.test(c)) s += 15;
  if (!isHasbro && /hasbro/i.test(c)) s -= 10;
  return s;
}

async function findBest(itemName, manufacturer, prefixes, expectedPrefix, pageTitles = []) {
  const cacheKey = `${manufacturer}:${itemName}`;
  const cache = loadCache();
  if (cache[cacheKey] !== undefined) return cache[cacheKey];

  const all = [];
  for (const title of pageTitles) {
    const imgs = await fetchPageImages(title);
    all.push(...imgs);
    await sleep(80);
  }
  for (const prefix of prefixes) {
    const imgs = await fetchImages(prefix);
    all.push(...imgs);
    await sleep(80);
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
  candidates.sort((a, b) => score(itemName, b.name, manufacturer, expectedPrefix) - score(itemName, a.name, manufacturer, expectedPrefix));
  const best = candidates[0];
  cache[cacheKey] = best.url || fandomUrl(best.name);
  saveCache(cache);
  return cache[cacheKey];
}

function partPrefixes(category, name, manufacturer) {
  const camel = toTitleCamel(name);
  const clean = noSpace(name);
  const base = category === 'assistBlade' ? 'AssistBlade' : category[0].toUpperCase() + category.slice(1);
  const wordPrefixes = words(name).filter((w) => w.length > 1);
  const prefixes = [
    `${base}${camel}`,
    `${base}${clean}`,
    `${base}${words(name)[0] || ''}`,
    clean,
    camel,
    ...wordPrefixes,
  ];
  if (manufacturer === 'Hasbro') {
    prefixes.push(`${base}${camel}Hasbro`, `${base}${clean}Hasbro`, `${clean}Hasbro`, `${camel}Hasbro`);
  }
  return Array.from(new Set(prefixes.filter(Boolean)));
}

async function fillParts() {
  const blades = loadJson('blades');
  for (const b of blades) {
    if (b.imageUrl) continue;
    const displayName = b.name === 'Disc Ball' ? 'Disk Ball' : b.name;
    const prefixes = partPrefixes('blade', displayName, b.manufacturer);
    const url = await findBest(displayName, b.manufacturer, prefixes, 'Blade', [`Blade - ${displayName}`]);
    if (url) b.imageUrl = url;
  }
  // Fallback: Hasbro blades without image use Takara blade image if same name exists
  for (const b of blades) {
    if (b.imageUrl || b.manufacturer !== 'Hasbro') continue;
    const baseName = b.name;
    const match = blades.find((x) => x.manufacturer === 'Takara Tomy' && x.name === baseName && x.imageUrl);
    if (match) b.imageUrl = match.imageUrl;
  }
  saveJson('blades', blades);

  const assistBlades = loadJson('assistBlades');
  for (const b of assistBlades) {
    if (b.imageUrl) continue;
    const prefixes = partPrefixes('assistBlade', b.name, b.manufacturer);
    const url = await findBest(b.name, b.manufacturer, prefixes, 'AssistBlade', [`Assist Blade - ${b.name}`]);
    if (url) b.imageUrl = url;
  }
  saveJson('assistBlades', assistBlades);

  const ratchets = loadJson('ratchets');
  for (const r of ratchets) {
    if (r.imageUrl) continue;
    const prefixes = partPrefixes('ratchet', r.name, r.manufacturer);
    const url = await findBest(r.name, r.manufacturer, prefixes, 'Ratchet', [`Ratchet - ${r.name}`]);
    if (url) r.imageUrl = url;
  }
  saveJson('ratchets', ratchets);

  const bits = loadJson('bits');
  for (const b of bits) {
    if (b.imageUrl) continue;
    const prefixes = partPrefixes('bit', b.name, b.manufacturer);
    const url = await findBest(b.name, b.manufacturer, prefixes, 'Bit', [`Bit - ${b.name}`]);
    if (url) b.imageUrl = url;
  }
  saveJson('bits', bits);

  const launchers = loadJson('launchers');
  for (const l of launchers) {
    if (l.imageUrl) continue;
    const camel = toTitleCamel(l.name);
    const clean = noSpace(l.name);
    const prefixes = Array.from(new Set([
      `Beyblade_X_${camel}`,
      `Beyblade_X_${clean}`,
      camel,
      clean,
    ].filter(Boolean)));
    const url = await findBest(l.name, l.manufacturer, prefixes, '');
    if (url) l.imageUrl = url;
  }
  saveJson('launchers', launchers);
}

async function fillBeys() {
  const beys = loadJson('beys');
  const blades = loadJson('blades');
  const bladeMap = new Map(blades.map((b) => [b.id, b]));
  for (const bey of beys) {
    if (bey.imageUrl) continue;
    const blade = bladeMap.get(bey.bladeId);
    const camel = toTitleCamel(bey.name);
    const clean = noSpace(bey.name);
    const bladeWordPrefixes = blade ? words(blade.name).filter((w) => w.length > 1) : [];
    const prefixes = Array.from(new Set([
      clean,
      camel,
      blade ? `${noSpace(blade.name)}_` : '',
      blade ? `${noSpace(blade.name)}` : '',
      blade ? `${toTitleCamel(blade.name)}` : '',
      ...bladeWordPrefixes,
    ].filter(Boolean)));
    const url = await findBest(bey.name, bey.manufacturer, prefixes, '');
    if (url) bey.imageUrl = url;
  }
  // Fallback to blade image for beys that still have no image
  for (const bey of beys) {
    if (bey.imageUrl) continue;
    const blade = bladeMap.get(bey.bladeId);
    if (blade?.imageUrl) {
      bey.imageUrl = blade.imageUrl;
    }
  }
  saveJson('beys', beys);
}

async function fillLauncherFallbacks() {
  const launchers = loadJson('launchers');
  const byBase = new Map();
  for (const l of launchers) {
    if (l.manufacturer !== 'Hasbro' || !l.imageUrl) continue;
    const baseId = l.id.replace(/-hasbro$/, '');
    byBase.set(baseId, l.imageUrl);
  }
  for (const l of launchers) {
    if (l.imageUrl) continue;
    const baseId = l.id.replace(/-hasbro$/, '');
    if (byBase.has(baseId)) {
      l.imageUrl = byBase.get(baseId);
      continue;
    }
    // Try matching any other launcher by stripped name
    const simpleName = l.name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/hasbro/g, '');
    const match = launchers.find((x) => x.imageUrl && x.id !== l.id && x.name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/hasbro/g, '') === simpleName);
    if (match) l.imageUrl = match.imageUrl;
  }
  saveJson('launchers', launchers);
}

async function main() {
  console.log('Filling part images...');
  await fillParts();
  console.log('Filling bey images...');
  await fillBeys();
  console.log('Filling launcher fallbacks...');
  await fillLauncherFallbacks();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
