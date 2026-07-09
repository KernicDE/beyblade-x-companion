const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

const FILES = ['blades.json', 'assistBlades.json', 'ratchets.json', 'bits.json', 'beys.json', 'launchers.json'];

function cleanText(text) {
  if (!text) return text;
  // Remove sentences containing official stats in English or German
  return text
    .replace(/\s*Official stats?:[^.]*\./gi, '')
    .replace(/\s*Offizielle Werte?:[^.]*\./gi, '')
    .replace(/\s*Geschätzte Werte?:[^.]*\./gi, '')
    .replace(/\s*Estimated stats?:[^.]*\./gi, '')
    .replace(/\s*Official stats?\s*\([^)]*\):[^.]*\./gi, '')
    .replace(/\s*Offizielle Werte?\s*\([^)]*\):[^.]*\./gi, '')
    .trim();
}

function cleanItem(item) {
  if (item.description) {
    item.description.en = cleanText(item.description.en);
    item.description.de = cleanText(item.description.de);
  }
  if (item.assessment) {
    item.assessment.en = cleanText(item.assessment.en);
    item.assessment.de = cleanText(item.assessment.de);
  }
  return item;
}

for (const file of FILES) {
  const filePath = path.join(DATA_DIR, file);
  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const cleaned = items.map(cleanItem);
  fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2) + '\n');
  console.log(`Cleaned ${file}`);
}

console.log('Done');
