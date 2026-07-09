const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'));
}

function saveJson(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

function zeroRatings() {
  return { attack: 0, defense: 0, stamina: 0, balance: 0 };
}

function idToName(id) {
  return id
    .replace(/-hasbro$/, '')
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\b(X|V|S|F|T|N|R|L|H|O|Q|P|G|B|U|D|M|W|A|C|E|J|K|Y|Z)\b/g, (m) => m.toUpperCase());
}

function main() {
  const beys = loadJson('beys');
  const blades = loadJson('blades');
  const assistBlades = loadJson('assistBlades');
  const ratchets = loadJson('ratchets');
  const bits = loadJson('bits');

  const bladeIds = new Set(blades.map((b) => b.id));
  const assistIds = new Set(assistBlades.map((b) => b.id));
  const ratchetIds = new Set(ratchets.map((r) => r.id));
  const bitIds = new Set(bits.map((b) => b.id));

  const missingBlades = new Set();
  const missingAssists = new Set();
  const missingRatchets = new Set();
  const missingBits = new Set();

  for (const bey of beys) {
    if (!bladeIds.has(bey.bladeId)) missingBlades.add(bey.bladeId);
    if (bey.assistBladeId && !assistIds.has(bey.assistBladeId)) missingAssists.add(bey.assistBladeId);
    if (!ratchetIds.has(bey.ratchetId)) missingRatchets.add(bey.ratchetId);
    if (!bitIds.has(bey.bitId)) missingBits.add(bey.bitId);
  }

  for (const id of missingBlades) {
    const isHasbro = id.endsWith('-hasbro');
    const name = idToName(id);
    blades.push({
      id,
      category: 'blade',
      name,
      manufacturer: isHasbro ? 'Hasbro' : 'Takara Tomy',
      imageUrl: '',
      releaseDate: '',
      releaseWave: '',
      description: `${name} Blade.`,
      assessment: `${name} is a Blade from the Beyblade X toyline. Manufactured by ${isHasbro ? 'Hasbro' : 'Takara Tomy'}.`,
      officialStats: {},
      ratings: zeroRatings(),
      ratingsDisclaimer: true,
    });
  }

  for (const id of missingAssists) {
    const name = idToName(id);
    assistBlades.push({
      id,
      category: 'assistBlade',
      name,
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '',
      releaseWave: '',
      description: `${name} Assist Blade.`,
      assessment: `${name} is an Assist Blade from the Beyblade X toyline. Manufactured by Takara Tomy.`,
      officialStats: {},
      ratings: zeroRatings(),
      ratingsDisclaimer: true,
    });
  }

  for (const id of missingRatchets) {
    const isHasbro = id.endsWith('-hasbro');
    const name = id.replace(/^ratchet-/, '').replace(/-hasbro$/, '');
    ratchets.push({
      id,
      category: 'ratchet',
      name,
      manufacturer: isHasbro ? 'Hasbro' : 'Takara Tomy',
      imageUrl: '',
      releaseDate: '',
      releaseWave: '',
      description: `The ${name} Ratchet.`,
      assessment: `${name} is a Ratchet from the Beyblade X toyline. Manufactured by ${isHasbro ? 'Hasbro' : 'Takara Tomy'}.`,
      officialStats: {},
      ratings: zeroRatings(),
      ratingsDisclaimer: true,
    });
  }

  for (const id of missingBits) {
    const isHasbro = id.endsWith('-hasbro');
    const name = id.replace(/^bit-/, '').replace(/-hasbro$/, '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    bits.push({
      id,
      category: 'bit',
      name,
      manufacturer: isHasbro ? 'Hasbro' : 'Takara Tomy',
      imageUrl: '',
      releaseDate: '',
      releaseWave: '',
      description: `The ${name} Bit.`,
      assessment: `${name} is a Bit from the Beyblade X toyline. Manufactured by ${isHasbro ? 'Hasbro' : 'Takara Tomy'}.`,
      officialStats: {},
      ratings: zeroRatings(),
      ratingsDisclaimer: true,
    });
  }

  saveJson('blades', blades);
  saveJson('assistBlades', assistBlades);
  saveJson('ratchets', ratchets);
  saveJson('bits', bits);

  console.log(`Created ${missingBlades.size} blades, ${missingAssists.size} assist blades, ${missingRatchets.size} ratchets, ${missingBits.size} bits.`);
}

main();
