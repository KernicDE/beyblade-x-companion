const fs = require('fs');
const path = require('path');
const vm = require('vm');

const inputPath = '/tmp/beybuilderx-parts.js';
const releasePath = '/tmp/beyblade-x-releases.txt';
const outputDir = process.argv[2] || path.join(__dirname, '../public/data');

const js = fs.readFileSync(inputPath, 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(js, context);

function toKebab(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/:/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function noSpace(name) {
  return name.replace(/\s+/g, '');
}

function toCamel(name) {
  return name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function filenameVariants(baseName, extensions = ['png']) {
  const clean = noSpace(baseName);
  const variants = new Set();
  const transforms = [
    (s) => s,
    (s) => s.replace(/[^a-zA-Z0-9]/g, ''),
    (s) => s.replace(/-/g, ''),
    (s) => s.replace(/:/g, ''),
  ];
  for (const ext of extensions) {
    for (const t of transforms) {
      variants.add(`${t(clean)}.${ext}`);
    }
  }
  return Array.from(variants);
}

function md5(str) {
  return require('crypto').createHash('md5').update(str).digest('hex');
}

function fandomUrl(filename) {
  const hash = md5(filename);
  return `https://static.wikia.nocookie.net/beyblade/images/${hash[0]}/${hash.slice(0, 2)}/${filename}/revision/latest`;
}

async function testImageUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.status === 200 ? url : null;
  } catch {
    return null;
  }
}

async function fetchImages(prefix) {
  const url = `https://beyblade.fandom.com/api.php?action=query&list=allimages&aiprefix=${encodeURIComponent(prefix)}&ailimit=50&format=json`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'beyblade-x-companion/1.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.query?.allimages || []).filter((img) => /\.(png|jpe?g)$/i.test(img.name));
  } catch {
    return [];
  }
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

function words(name) {
  return name.replace(/[^a-zA-Z0-9]+/g, ' ').split(' ').filter(Boolean);
}

const JUNK_WORDS = ["'s", 'battles', 'flashback', 'crash', 'centralized', 'prototype', 'packaging', 'qr_code', 'info', 'angled'];
function isJunk(name) {
  const c = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return JUNK_WORDS.some((j) => c.includes(j.replace(/[^a-z0-9]/g, '')));
}

function candidateScore(itemName, candidateName, expectedPrefix = '') {
  const c = candidateName.toLowerCase();
  const ws = words(itemName).map((w) => w.toLowerCase());
  let score = 0;
  for (const w of ws) if (c.includes(w)) score += 10;
  if (expectedPrefix && c.startsWith(expectedPrefix.toLowerCase())) score += 30;
  if (/^blade|^assistblade|^bit|^ratchet/i.test(c)) score += 10;
  if (/\.png$/i.test(candidateName)) score += 3;
  if (/_\d+-\d+/.test(candidateName)) score += 4;
  if (isJunk(candidateName)) score -= 100;
  if (/hasbro/i.test(c) && !/hasbro/i.test(itemName)) score -= 5;
  return score;
}

async function findBestImage(itemName, options) {
  const { directFilenames = [], prefixes = [], expectedPrefix = '', extraImages = [] } = options;
  for (const fn of directFilenames) {
    const ok = await testImageUrl(fandomUrl(fn));
    if (ok) return fn;
  }
  const all = [...extraImages];
  for (const prefix of prefixes) {
    const imgs = await fetchImages(prefix);
    all.push(...imgs);
    await new Promise((r) => setTimeout(r, 100));
  }
  if (all.length === 0) return '';
  const byName = new Map();
  for (const img of all) {
    if (!byName.has(img.name)) byName.set(img.name, img);
  }
  const candidates = Array.from(byName.values()).filter((img) => !isJunk(img.name));
  if (candidates.length === 0) return '';
  candidates.sort((a, b) => candidateScore(itemName, b.name, expectedPrefix) - candidateScore(itemName, a.name, expectedPrefix));
  return candidates[0].name;
}

async function bladeImage(name) {
  const camel = toCamel(name);
  const clean = noSpace(name).replace(/[^a-zA-Z0-9]/g, '');
  const direct = filenameVariants(`Blade${noSpace(name)}`, ['png']).concat(filenameVariants(noSpace(name), ['png']));
  const prefixes = Array.from(new Set([`Blade${camel}`, `Blade${clean}`, `Blade${words(name)[0] || ''}`, camel, clean, words(name)[0] || ''].filter(Boolean)));
  const pageImages = await fetchPageImages(`Blade - ${name}`);
  const result = await findBestImage(name, {
    directFilenames: direct,
    prefixes,
    expectedPrefix: 'Blade',
    extraImages: pageImages,
  });
  return result;
}

async function assistImage(name) {
  const camel = toCamel(name);
  const clean = noSpace(name).replace(/[^a-zA-Z0-9]/g, '');
  const direct = filenameVariants(`AssistBlade${noSpace(name)}`, ['png']);
  const prefixes = Array.from(new Set([`AssistBlade${camel}`, `AssistBlade${clean}`, `AssistBlade${words(name)[0] || ''}`, camel, clean].filter(Boolean)));
  const pageImages = await fetchPageImages(`Assist Blade - ${name}`);
  return findBestImage(name, {
    directFilenames: direct,
    prefixes,
    expectedPrefix: 'AssistBlade',
    extraImages: pageImages,
  });
}

function bitImage(name) {
  const camel = toCamel(name);
  const clean = noSpace(name).replace(/[^a-zA-Z0-9]/g, '');
  return findBestImage(name, {
    directFilenames: filenameVariants(`Bit${noSpace(name)}`, ['png']),
    prefixes: Array.from(new Set([`Bit${camel}`, `Bit${clean}`, `Bit${words(name)[0] || ''}`, camel, clean].filter(Boolean))),
    expectedPrefix: 'Bit',
  });
}

function ratchetImage(name) {
  return findBestImage(name, {
    directFilenames: [`Ratchet${noSpace(name)}.png`, `Ratchet_${noSpace(name)}.png`],
    prefixes: [`Ratchet${noSpace(name)}`, `Ratchet_${noSpace(name)}`],
    expectedPrefix: 'Ratchet',
  });
}

function zeroRatings() {
  return { attack: 0, defense: 0, stamina: 0, balance: 0 };
}

function prettyName(name) {
  return name.replace(/([A-Z])/g, ' $1').replace(/:\s*/g, ': ').trim();
}

function parseDate(text) {
  if (!text) return '';
  const m = text.match(/([A-Za-z]+)\s+(\d+)(?:st|nd|rd|th)?,\s+(\d{4})/);
  if (!m) return '';
  const months = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };
  const month = months[m[1].toLowerCase()];
  if (!month) return '';
  return `${m[3]}-${month}-${m[2].padStart(2, '0')}`;
}

function buildReleaseMap() {
  const txt = fs.readFileSync(releasePath, 'utf8');
  const map = new Map();
  for (const line of txt.split('\n')) {
    const m = line.match(/^\|\s*([A-Z]+-\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|/);
    if (m) {
      const code = m[1].trim();
      const date = parseDate(m[3].trim());
      if (date && !map.has(code)) map.set(code, date);
    }
  }
  return map;
}

const manualImageOverrides = {
  // Collab / special blades where automatic search does not find the product image
  'mammoth-tusk': 'MammothTusk_2-80E.png',
  'shinobi-knife': 'BladeKnifeShinobi.png',
  'samurai-steel': 'SamuraiSteel_5-70GF.jpg',
  'spider-man': 'BladeSpiderMan.png',
  'bear-scratch': 'BearScratch_(BX-37).png',
  'general-grievous': 'General_Grievous_3-80HN.jpeg',
  'shockwave': 'Shockwave_5-80O.jpeg',
  'miles-morales': 'Miles_Morales_1-60GN.jpeg',
  'stormtrooper': 'Stormtrooper_5-70B.jpeg',
  'stun-medusa': 'Stun_Medusa_9-60GB.jpeg',
  'tricera-spikey': 'BladeTriceraSpiky.png',
  // Assist blades
  'turn-a': 'AssistBladeTurn.png',
  'turn-d': 'AssistBladeTurn.png',
  'dual-u': 'AssistBladeDual_(Smash_Mode).png',
  'dual-s': 'AssistBladeDual_(Smash_Mode).png',
  // Hasbro beys
  'steel-samurai4-80t-g0188': 'Steel_Samurai_4-80T.jpeg',
  'talon-ptera3-80b-g0195': 'Talon_Ptera_3-80B.jpeg',
};

const releaseMap = buildReleaseMap();

function formatDate(date) {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

function partAssessment(category, name, weight, height, manufacturer, system, spin) {
  const pretty = prettyName(name);
  const weightNote = weight > 0 ? ` Documented weight: ${weight}g.` : '';
  const heightNote = height > 0 ? ` Documented height: ${height}mm.` : '';
  const sys = system || 'toyline';
  switch (category) {
    case 'blade':
      return `${pretty} is a ${spin || 'right'}-spin Blade from the Beyblade X ${sys} line.${weightNote} Manufactured by ${manufacturer}.`;
    case 'assistBlade':
      return `${pretty} is an Assist Blade from the Beyblade X ${sys} line.${weightNote} Manufactured by ${manufacturer}.`;
    case 'ratchet':
      return `${pretty} is a Ratchet from the Beyblade X toyline.${heightNote}${weightNote} Manufactured by ${manufacturer}.`;
    case 'bit':
      return `${pretty} is a Bit from the Beyblade X toyline.${heightNote}${weightNote} Manufactured by ${manufacturer}.`;
    default:
      return `${pretty} is a Beyblade X part. Manufactured by ${manufacturer}.`;
  }
}

function launcherAssessment(l) {
  return `${l.name} is a ${l.spinCapability}-spin launcher from the Beyblade X toyline. Manufactured by ${l.manufacturer}.`;
}

async function generateParts() {
  const blades = [];
  for (const b of context.blades.filter((x) => x.system === 'BX' || x.system === 'UX')) {
    const name = prettyName(b.name);
    const id = toKebab(b.name);
    let filename = await bladeImage(b.name);
    if (manualImageOverrides[id]) filename = manualImageOverrides[id];
    blades.push({
      id,
      category: 'blade',
      name,
      manufacturer: 'Takara Tomy',
      imageUrl: filename ? fandomUrl(filename) : '',
      releaseDate: '',
      releaseWave: b.system,
      description: `${name} Blade from the ${b.system} system.`,
      assessment: partAssessment('blade', b.name, b.weight, 0, 'Takara Tomy', b.system, b.spin === 'left' ? 'left' : 'right'),
      officialStats: {
        weightGrams: b.weight > 0 ? b.weight : undefined,
        spinDirection: b.spin === 'left' ? 'left' : 'right',
      },
      ratings: zeroRatings(),
      ratingsDisclaimer: true,
    });
  }

  const assistBlades = [];
  for (const b of context.assistBlades) {
    const id = toKebab(b.name);
    let filename = await assistImage(b.name);
    if (manualImageOverrides[id]) filename = manualImageOverrides[id];
    assistBlades.push({
      id: toKebab(b.name),
      category: 'assistBlade',
      name: b.name,
      manufacturer: 'Takara Tomy',
      imageUrl: filename ? fandomUrl(filename) : '',
      releaseDate: '',
      releaseWave: b.system,
      description: `The ${b.name} Assist Blade.`,
      assessment: partAssessment('assistBlade', b.name, b.weight, b.height, 'Takara Tomy', b.system),
      officialStats: {
        weightGrams: b.weight > 0 ? b.weight : undefined,
        spinDirection: 'right',
      },
      ratings: zeroRatings(),
      ratingsDisclaimer: true,
    });
  }

  const ratchets = [];
  for (const r of context.rachets.filter((x) => x.type === 'ratchet' || x.type === 'simple')) {
    const filename = await ratchetImage(r.name);
    ratchets.push({
      id: `ratchet-${r.name}`,
      category: 'ratchet',
      name: r.name,
      manufacturer: 'Takara Tomy',
      imageUrl: filename ? fandomUrl(filename) : '',
      releaseDate: '',
      releaseWave: 'BX',
      description: `The ${r.name} Ratchet.`,
      assessment: partAssessment('ratchet', r.name, r.weight, r.height, 'Takara Tomy'),
      officialStats: {
        heightMm: r.height > 0 ? r.height : undefined,
        weightGrams: r.weight > 0 ? r.weight : undefined,
      },
      ratings: zeroRatings(),
      ratingsDisclaimer: true,
    });
  }

  const bits = [];
  for (const b of context.bits.filter((x) => x.type === 'bit')) {
    // Data source calls it "Disc Ball", Fandom uses "Disk Ball".
    const displayName = b.name === 'Disc Ball' ? 'Disk Ball' : b.name;
    const filename = await bitImage(displayName);
    bits.push({
      id: `bit-${toKebab(displayName)}`,
      category: 'bit',
      name: displayName,
      manufacturer: 'Takara Tomy',
      imageUrl: filename ? fandomUrl(filename) : '',
      releaseDate: '',
      releaseWave: 'BX',
      description: `The ${displayName} Bit.`,
      assessment: partAssessment('bit', displayName, b.weight, b.height, 'Takara Tomy'),
      officialStats: {
        heightMm: b.height > 0 ? b.height : undefined,
      },
      ratings: zeroRatings(),
      ratingsDisclaimer: true,
    });
  }

  return { blades, assistBlades, ratchets, bits };
}

function buildBeyImageFilenames(bladeName, ratchetName, bitAbbv) {
  const base = noSpace(bladeName);
  return [
    `${base}_${ratchetName}${bitAbbv}.jpeg`,
    `${base}_${ratchetName}${bitAbbv}.jpg`,
    `${base}_${ratchetName}${bitAbbv}.png`,
    `${base}_${ratchetName}.jpeg`,
    `${base}_${ratchetName}.jpg`,
    `${base}_${ratchetName}.png`,
  ];
}

async function generateBeys(parts) {
  const bladeById = new Map(parts.blades.map((b) => [b.id, b]));
  const ratchetByName = new Map(parts.ratchets.map((r) => [r.name, r]));
  const bitByName = new Map(parts.bits.map((b) => [b.name, b]));
  const bitAbbv = new Map(context.bits.filter((b) => b.type === 'bit').map((b) => [b.name, b.abbv]));

  const knownBeys = [
    { name: 'Dran Sword 3-60F', releaseWave: 'BX-01', blade: 'DranSword', ratchet: '3-60', bit: 'Flat' },
    { name: 'Hells Scythe 4-60T', releaseWave: 'BX-02', blade: 'HellsScythe', ratchet: '4-60', bit: 'Taper' },
    { name: 'Knight Shield 3-80N', releaseWave: 'BX-03', blade: 'KnightShield', ratchet: '3-80', bit: 'Needle' },
    { name: 'Wizard Arrow 4-80B', releaseWave: 'BX-04', blade: 'WizardArrow', ratchet: '4-80', bit: 'Ball' },
    { name: 'Knight Lance 4-80HN', releaseWave: 'BX-13', blade: 'KnightLance', ratchet: '4-80', bit: 'High Needle' },
    { name: 'Shark Edge 3-60LF', releaseWave: 'BX-06', blade: 'SharkEdge', ratchet: '3-60', bit: 'Low Flat' },
    { name: 'LeonClaw 5-60P', releaseWave: 'BX-15', blade: 'LeonClaw', ratchet: '5-60', bit: 'Point' },
    { name: 'ViperTail 5-80O', releaseWave: 'BX-08', blade: 'ViperTail', ratchet: '5-80', bit: 'Orb' },
    { name: 'DranDagger 4-60R', releaseWave: 'BX-20', blade: 'DranDagger', ratchet: '4-60', bit: 'Rush' },
    { name: 'HellsChain 5-60HT', releaseWave: 'BX-21', blade: 'HellsChain', ratchet: '5-60', bit: 'High Taper' },
    { name: 'RhinoHorn 3-80S', releaseWave: 'BX-19', blade: 'RhinoHorn', ratchet: '3-80', bit: 'Spike' },
    { name: 'PhoenixFeather 3-60F', releaseWave: 'BX-00', blade: 'PhoenixFeather', ratchet: '3-60', bit: 'Flat' },
    { name: 'WyvernGale 2-60S', releaseWave: 'BX-14', blade: 'WyvernGale', ratchet: '2-60', bit: 'Spike' },
    { name: 'UnicornSting 5-60GP', releaseWave: 'BX-26', blade: 'UnicornSting', ratchet: '5-60', bit: 'Gear Point' },
    { name: 'SphinxCowl 4-80HT', releaseWave: 'BX-27', blade: 'SphinxCowl', ratchet: '4-80', bit: 'High Taper' },
    { name: 'ViperTail 5-80O', releaseWave: 'BX-16', blade: 'ViperTail', ratchet: '5-80', bit: 'Orb' },

    { name: 'Sword Dran 3-60F', releaseWave: 'F9580', blade: 'DranSword', ratchet: '3-60', bit: 'Flat', manufacturer: 'Hasbro' },
    { name: 'Helm Knight 3-80N', releaseWave: 'F9581', blade: 'KnightShield', ratchet: '3-80', bit: 'Needle', manufacturer: 'Hasbro' },
    { name: 'Arrow Wizard 4-80B', releaseWave: 'F9582', blade: 'WizardArrow', ratchet: '4-80', bit: 'Ball', manufacturer: 'Hasbro' },
    { name: 'Scythe Incendio 4-60T', releaseWave: 'F9583', blade: 'HellsScythe', ratchet: '4-60', bit: 'Taper', manufacturer: 'Hasbro' },
    { name: 'Steel Samurai 4-80T', releaseWave: 'G0188', blade: 'SamuraiSteel', ratchet: '4-80', bit: 'Taper', manufacturer: 'Hasbro' },
    { name: 'Horn Rhino 3-80S', releaseWave: 'G0192', blade: 'RhinoHorn', ratchet: '3-80', bit: 'Spike', manufacturer: 'Hasbro' },
    { name: 'Keel Shark 3-60LF', releaseWave: 'G0194', blade: 'SharkEdge', ratchet: '3-60', bit: 'Low Flat', manufacturer: 'Hasbro' },
    { name: 'Talon Ptera 3-80B', releaseWave: 'G0195', blade: 'PteraSwing', ratchet: '3-80', bit: 'Ball', manufacturer: 'Hasbro' },
  ];

  const beys = [];
  const seenIds = new Set();
  for (const known of knownBeys) {
    const bladeId = toKebab(known.blade);
    const blade = bladeById.get(bladeId);
    const ratchet = ratchetByName.get(known.ratchet);
    const bit = bitByName.get(known.bit);
    if (!blade || !ratchet || !bit) {
      console.log(`Skipping ${known.name}: missing parts`);
      continue;
    }

    let beyId = `${toKebab(known.name.replace(/\s+/g, ''))}-${known.releaseWave.toLowerCase()}`;
    seenIds.add(beyId);

    const abbv = bitAbbv.get(known.bit) || '';
    const filenames = buildBeyImageFilenames(known.blade, known.ratchet, abbv);
    let filename = await findBestImage(known.name, {
      directFilenames: filenames,
      prefixes: [`${noSpace(known.blade)}_`, `${noSpace(known.blade)}`],
      expectedPrefix: '',
    });
    if (manualImageOverrides[beyId]) filename = manualImageOverrides[beyId];

    const releaseDate = releaseMap.get(known.releaseWave.toUpperCase()) || '';

    beys.push({
      id: beyId,
      name: known.name,
      manufacturer: known.manufacturer || 'Takara Tomy',
      imageUrl: filename ? fandomUrl(filename) : '',
      releaseDate,
      releaseWave: known.releaseWave,
      bladeId,
      ratchetId: ratchet.id,
      bitId: bit.id,
      assessment: '',
    });
  }

  return beys;
}

function generateLaunchers() {
  return [
    {
      id: 'winder-launcher',
      name: 'Winder Launcher',
      manufacturer: 'Takara Tomy',
      imageUrl: fandomUrl('Beyblade_X_Winder_Launcher.jpeg'),
      releaseDate: '2023-07-15',
      description: 'A compact ripcord-style launcher included with starter sets.',
      assessment: launcherAssessment({ name: 'Winder Launcher', spinCapability: 'right', manufacturer: 'Takara Tomy' }),
      spinCapability: 'right',
    },
    {
      id: 'winder-launcher-l',
      name: 'Winder Launcher L',
      manufacturer: 'Takara Tomy',
      imageUrl: fandomUrl('Beyblade_X_Winder_Launcher_L.jpeg'),
      releaseDate: '2025-03-29',
      description: 'A left-spin variant of the Winder Launcher.',
      assessment: launcherAssessment({ name: 'Winder Launcher L', spinCapability: 'left', manufacturer: 'Takara Tomy' }),
      spinCapability: 'left',
    },
    {
      id: 'string-launcher',
      name: 'String Launcher',
      manufacturer: 'Takara Tomy',
      imageUrl: fandomUrl('Beyblade_X_String_Launcher.jpeg'),
      releaseDate: '2023-10-07',
      description: 'A string-pull launcher for strong, consistent launches.',
      assessment: launcherAssessment({ name: 'String Launcher', spinCapability: 'right', manufacturer: 'Takara Tomy' }),
      spinCapability: 'right',
    },
    {
      id: 'string-launcher-l',
      name: 'String Launcher L',
      manufacturer: 'Takara Tomy',
      imageUrl: fandomUrl('Beyblade_X_String_Launcher_L.jpeg'),
      releaseDate: '2025-10-11',
      description: 'A left-spin string-pull launcher.',
      assessment: launcherAssessment({ name: 'String Launcher L', spinCapability: 'left', manufacturer: 'Takara Tomy' }),
      spinCapability: 'left',
    },
    {
      id: 'custom-launcher',
      name: 'Custom Launcher',
      manufacturer: 'Takara Tomy',
      imageUrl: fandomUrl('Custom_BeyLauncher_LR.jpg'),
      releaseDate: '',
      description: 'A modular launcher used with the Custom Line system.',
      assessment: launcherAssessment({ name: 'Custom Launcher', spinCapability: 'right', manufacturer: 'Takara Tomy' }),
      spinCapability: 'right',
    },
  ];
}

function beyAssessment(bey, parts) {
  const blade = parts.blades.find((p) => p.id === bey.bladeId);
  const ratchet = parts.ratchets.find((p) => p.id === bey.ratchetId);
  const bit = parts.bits.find((p) => p.id === bey.bitId);
  const spin = blade?.officialStats.spinDirection || 'right';
  const dateText = bey.releaseDate ? ` Released on ${formatDate(bey.releaseDate)}.` : '';
  const partsText = [blade?.name, ratchet?.name, bit?.name].filter(Boolean).join(' / ');
  return `${bey.name} is a ${spin}-spin factory-combined Beyblade from ${bey.manufacturer}, released as ${bey.releaseWave}.${dateText} Parts: ${partsText}.`;
}

function derivePartReleaseDates(parts, beys) {
  const bladeDates = new Map();
  const assistDates = new Map();
  const ratchetDates = new Map();
  const bitDates = new Map();
  for (const bey of beys) {
    if (!bey.releaseDate) continue;
    const push = (map, id) => {
      if (!id) return;
      const cur = map.get(id);
      if (!cur || bey.releaseDate < cur) map.set(id, bey.releaseDate);
    };
    push(bladeDates, bey.bladeId);
    push(assistDates, bey.assistBladeId);
    push(ratchetDates, bey.ratchetId);
    push(bitDates, bey.bitId);
  }
  for (const b of parts.blades) b.releaseDate = bladeDates.get(b.id) || '';
  for (const ab of parts.assistBlades) ab.releaseDate = assistDates.get(ab.id) || '';
  for (const r of parts.ratchets) r.releaseDate = ratchetDates.get(r.id) || '';
  for (const b of parts.bits) b.releaseDate = bitDates.get(b.id) || '';
}

async function main() {
  const parts = await generateParts();
  const beys = await generateBeys(parts);
  derivePartReleaseDates(parts, beys);
  for (const bey of beys) {
    bey.assessment = beyAssessment(bey, parts);
  }
  const launchers = generateLaunchers();

  fs.writeFileSync(path.join(outputDir, 'blades.json'), JSON.stringify(parts.blades, null, 2));
  fs.writeFileSync(path.join(outputDir, 'assistBlades.json'), JSON.stringify(parts.assistBlades, null, 2));
  fs.writeFileSync(path.join(outputDir, 'ratchets.json'), JSON.stringify(parts.ratchets, null, 2));
  fs.writeFileSync(path.join(outputDir, 'bits.json'), JSON.stringify(parts.bits, null, 2));
  fs.writeFileSync(path.join(outputDir, 'launchers.json'), JSON.stringify(launchers, null, 2));
  fs.writeFileSync(path.join(outputDir, 'beys.json'), JSON.stringify(beys, null, 2));

  console.log(`Wrote ${parts.blades.length} blades, ${parts.assistBlades.length} assist blades, ${parts.ratchets.length} ratchets, ${parts.bits.length} bits, ${launchers.length} launchers, ${beys.length} beys.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
