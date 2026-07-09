const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');
const CACHE_FILE = path.join(__dirname, '../.tmp/stats-cache.json');

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

async function fetchWikitext(title) {
  const url = `https://beyblade.fandom.com/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'beyblade-x-companion/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.parse?.wikitext?.['*'] || null;
  } catch {
    return null;
  }
}

function extractStat(wikitext, key) {
  const m = wikitext.match(new RegExp(`\\|${key}=(.+?)(?:\\r?\\n|\\|)`));
  if (!m) return undefined;
  const raw = m[1].trim();
  if (!raw || raw === '-' || raw.toLowerCase() === 'n/a') return undefined;
  // Stop at HTML tags, spaces, or other separators to avoid concatenating multiple numbers
  const val = raw.split(/[< \n\r\t|]/)[0];
  const num = parseFloat(val.replace(/[^0-9.]/g, ''));
  return Number.isNaN(num) ? undefined : num;
}

function extractStringStat(wikitext, key) {
  const m = wikitext.match(new RegExp(`\\|${key}=(.+?)(?:\\r?\\n|\\|)`));
  if (!m) return undefined;
  const val = m[1].trim();
  if (!val || val === '-') return undefined;
  return val;
}

async function fetchPartStats(part) {
  const cache = loadCache();
  const cacheKey = `${part.category}:${part.id}`;
  if (cache[cacheKey] !== undefined) return cache[cacheKey];

  let pageTitle;
  const displayName = part.name === 'Disc Ball' ? 'Disk Ball' : part.name;
  const camel = toTitleCamel(displayName);
  if (part.category === 'blade') pageTitle = `Blade - ${camel}`;
  else if (part.category === 'assistBlade') pageTitle = `Assist Blade - ${camel}`;
  else if (part.category === 'ratchet') pageTitle = `Ratchet - ${displayName}`;
  else if (part.category === 'bit') pageTitle = `Bit - ${displayName}`;
  else pageTitle = displayName;

  const wikitext = await fetchWikitext(pageTitle);
  await sleep(100);
  if (!wikitext) {
    cache[cacheKey] = null;
    saveCache(cache);
    return null;
  }

  const stats = {
    attackStat: extractStat(wikitext, 'AttackStat'),
    defenseStat: extractStat(wikitext, 'DefenseStat'),
    staminaStat: extractStat(wikitext, 'StaminaStat'),
    weightGrams: extractStat(wikitext, 'Weight'),
    heightMm: extractStat(wikitext, 'HeightStat') ?? extractStat(wikitext, 'Height'),
    typeTag: extractStringStat(wikitext, 'Type'),
    spinDirection: extractStringStat(wikitext, 'SpinDirection')?.toLowerCase().includes('left') ? 'left' : 'right',
  };
  cache[cacheKey] = stats;
  saveCache(cache);
  return stats;
}

function calculateCategoryMax(parts, keys) {
  const max = {};
  for (const key of keys) max[key] = 0;
  for (const part of parts) {
    for (const key of keys) {
      const val = part._fandomStats?.[key];
      if (typeof val === 'number' && val > max[key]) max[key] = val;
    }
  }
  return max;
}

function scaleRating(value, max) {
  if (typeof value !== 'number' || max <= 0) return 0;
  return Math.min(5, Math.max(0, Math.round((value / max) * 50) / 10));
}

function buildAssessment(part, stats) {
  const type = stats.typeTag || part.officialStats.typeTag || 'Balance';
  const spin = stats.spinDirection || part.officialStats.spinDirection || 'right';
  const weight = stats.weightGrams ?? part.officialStats.weightGrams;
  const height = stats.heightMm ?? part.officialStats.heightMm;
  const statParts = [];
  if (typeof stats.attackStat === 'number') statParts.push(`Attack ${stats.attackStat}`);
  if (typeof stats.defenseStat === 'number') statParts.push(`Defense ${stats.defenseStat}`);
  if (typeof stats.staminaStat === 'number') statParts.push(`Stamina ${stats.staminaStat}`);

  let text = `${part.name} is a ${spin}-spin ${type} Type ${part.category === 'assistBlade' ? 'Assist Blade' : part.category[0].toUpperCase() + part.category.slice(1)}.`;
  if (statParts.length > 0) text += ` Official stats: ${statParts.join(' / ')}.`;
  if (weight) text += ` Weight: ${weight}g.`;
  if (height) text += ` Height: ${height}mm.`;
  text += ` Manufactured by ${part.manufacturer}.`;
  return text;
}

async function fillPartStats() {
  const blades = loadJson('blades');
  const assistBlades = loadJson('assistBlades');
  const ratchets = loadJson('ratchets');
  const bits = loadJson('bits');

  const allParts = [...blades, ...assistBlades, ...ratchets, ...bits];

  for (const part of allParts) {
    const stats = await fetchPartStats(part);
    if (!stats) continue;
    part._fandomStats = stats;
  }

  const groups = [
    { parts: blades, category: 'blade' },
    { parts: assistBlades, category: 'assistBlade' },
    { parts: ratchets, category: 'ratchet' },
    { parts: bits, category: 'bit' },
  ];

  for (const group of groups) {
    const max = calculateCategoryMax(group.parts.map((p) => ({ ...p, category: group.category })), ['attackStat', 'defenseStat', 'staminaStat']);
    for (const part of group.parts) {
      const stats = part._fandomStats;
      if (!stats) continue;
      if (stats.weightGrams) part.officialStats.weightGrams = stats.weightGrams;
      if (stats.heightMm) part.officialStats.heightMm = stats.heightMm;
      if (stats.typeTag) part.officialStats.typeTag = stats.typeTag;
      if (stats.spinDirection) part.officialStats.spinDirection = stats.spinDirection;

      const attack = scaleRating(stats.attackStat, max.attackStat);
      const defense = scaleRating(stats.defenseStat, max.defenseStat);
      const stamina = scaleRating(stats.staminaStat, max.staminaStat);
      const balance = Math.round(((attack + defense + stamina) / 3) * 10) / 10;
      part.ratings = { attack, defense, stamina, balance };

      part.assessment = buildAssessment({ ...part, category: group.category }, stats);
      delete part._fandomStats;
    }
  }

  saveJson('blades', blades);
  saveJson('assistBlades', assistBlades);
  saveJson('ratchets', ratchets);
  saveJson('bits', bits);
}

function updateBeys() {
  const beys = loadJson('beys');
  const blades = loadJson('blades');
  const assistBlades = loadJson('assistBlades');
  const ratchets = loadJson('ratchets');
  const bits = loadJson('bits');
  const bladeMap = new Map(blades.map((b) => [b.id, b]));
  const assistMap = new Map(assistBlades.map((b) => [b.id, b]));
  const ratchetMap = new Map(ratchets.map((r) => [r.id, r]));
  const bitMap = new Map(bits.map((b) => [b.id, b]));

  for (const bey of beys) {
    const blade = bladeMap.get(bey.bladeId);
    const assist = bey.assistBladeId ? assistMap.get(bey.assistBladeId) : undefined;
    const ratchet = ratchetMap.get(bey.ratchetId);
    const bit = bitMap.get(bey.bitId);
    const partsText = [blade?.name, assist?.name, ratchet?.name, bit?.name].filter(Boolean).join(' / ');
    const spin = blade?.officialStats?.spinDirection || 'right';
    bey.assessment = `${bey.name} is a ${spin}-spin factory-combined Beyblade from ${bey.manufacturer}, released as ${bey.releaseWave}. Parts: ${partsText}.`;
  }
  saveJson('beys', beys);
}

async function main() {
  console.log('Fetching Fandom stats for parts...');
  await fillPartStats();
  console.log('Updating bey assessments...');
  updateBeys();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
