/**
 * update-sprite-urls.cjs — Replace sprite URLs in data JSONs with R2 URLs.
 *
 * Maps existing Serebii/PokeAPI URLs to Cloudflare R2 URLs using the same
 * ID extraction logic as download-sprites.cjs.
 *
 * Usage: node scripts/update-sprite-urls.cjs
 */

const fs = require('fs');
const path = require('path');

const R2_BASE = 'https://pub-aa43740e9f1f450ca7cd054cdf60d907.r2.dev';

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const MAIN_FILE = path.join(DATA_DIR, 'main-timeline.json');
const FORMS_FILE = path.join(DATA_DIR, 'forms.json');

/** Extract the PokeAPI numeric ID from a sprite URL (same logic as download script). */
function extractPokeId(url) {
  if (!url || url.includes('blank')) return null;

  if (url.includes('serebii')) {
    const match = url.match(/\/(\d+)\.png/);
    if (match) return String(parseInt(match[1], 10)); // remove leading zeros
  } else if (url.includes('PokeAPI') || url.includes('pokeapi')) {
    const match = url.match(/\/(\d+)\.png/);
    if (match) return match[1];
  }
  return null;
}

function updateFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let updated = 0;
  let skipped = 0;

  const result = data.map(entry => {
    const pokeId = extractPokeId(entry.sprite);
    if (pokeId) {
      updated++;
      return { ...entry, sprite: `${R2_BASE}/${pokeId}.png` };
    }
    skipped++;
    console.log(`  Skipped: ${entry.id} — ${entry.sprite}`);
    return entry;
  });

  fs.writeFileSync(filePath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(`  ${updated} updated, ${skipped} skipped`);
  return { updated, skipped };
}

console.log('Updating main-timeline.json...');
const main = updateFile(MAIN_FILE);

console.log('Updating forms.json...');
const forms = updateFile(FORMS_FILE);

console.log(`\nTotal: ${main.updated + forms.updated} updated, ${main.skipped + forms.skipped} skipped`);
