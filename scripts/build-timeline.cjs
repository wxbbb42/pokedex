/**
 * Build main-timeline.json from Serebii depositable list
 * Maps zh names from existing pokemon.json + forms.json
 */
const fs = require('fs');

const serebii = JSON.parse(fs.readFileSync('./data/serebii-normal.json', 'utf-8'));
const pokemon = JSON.parse(fs.readFileSync('../public/data/pokemon.json', 'utf-8'));
const forms = JSON.parse(fs.readFileSync('../public/data/forms.json', 'utf-8'));

// Build lookup maps
const pokeByNum = {}; // num -> {zh, en, sprite}
pokemon.forEach(p => { pokeByNum[p.id] = p; });

const formById = {}; // id -> {zh, en, sprite}
forms.forEach(f => { formById[f.id] = f; });

// Serebii suffix → our forms.json id mapping
// Pattern: NNN-suffix.png → map to our form IDs
// We'll build a mapping based on known patterns
const SEREBII_SPRITE_BASE = 'https://www.serebii.net/pokemonhome/pokemon/80/';

// Map Serebii filename suffix to our forms.json IDs
// Format: { '019-a': 'a-rattata', '052-g': 'g-meowth', ... }
const SUFFIX_TO_FORM_ID = {
  // Alolan forms (-a)
  '019-a': 'a-rattata', '020-a': 'a-raticate', '026-a': 'a-raichu',
  '027-a': 'a-sandshrew', '028-a': 'a-sandslash', '037-a': 'a-vulpix',
  '038-a': 'a-ninetales', '050-a': 'a-diglett', '051-a': 'a-dugtrio',
  '052-a': 'a-meowth', '053-a': 'a-persian', '074-a': 'a-geodude',
  '075-a': 'a-graveler', '076-a': 'a-golem', '088-a': 'a-grimer',
  '089-a': 'a-muk', '103-a': 'a-exeggutor', '105-a': 'a-marowak',
  // Galarian forms (-g)
  '052-g': 'g-meowth', '077-g': 'g-ponyta', '078-g': 'g-rapidash',
  '079-g': 'g-slowpoke', '080-g': 'g-slowbro', '083-g': 'g-farfetchd',
  '110-g': 'g-weezing', '122-g': 'g-mrmime', '144-g': 'g-articuno',
  '145-g': 'g-zapdos', '146-g': 'g-moltres', '199-g': 'g-slowking',
  '263-g': 'g-zigzagoon', '264-g': 'g-linoone', '554-g': 'g-darumaka',
  '555-g': 'g-darmanitan', '562-g': 'g-yamask', '618-g': 'g-stunfisk',
  // Hisuian forms (-h)
  '157-h': 'h-typhlosion', '503-h': 'h-samurott', '549-h': 'h-lilligant',
  '570-h': 'h-zorua', '571-h': 'h-zoroark', '100-h': 'h-voltorb',
  '101-h': 'h-electrode', '058-h': 'h-growlithe', '059-h': 'h-arcanine',
  '211-h': 'h-qwilfish', '215-h': 'h-sneasel', '484-h': null, // Palkia? skip
  '430-h': null, '641-h': null,
  '549-h': 'h-lilligant', '705-h': 'h-sliggoo', '706-h': 'h-goodra',
  '483-h': null, '724-h': 'h-decidueye', '713-h': 'h-avalugg',
  '628-h': 'h-braviary',
  // Paldean forms (-p)
  '194-p': 'p-wooper',
  // Paldean Tauros (multiple)
  '128-p': 'p-tauros-c', // combat breed
  // Gender forms (-f) — we need to handle these
  // Pikachu caps
  '025-o': 'pikachu-original-cap', '025-h': 'pikachu-hoenn-cap',
  '025-s': 'pikachu-sinnoh-cap', '025-u': 'pikachu-unova-cap',
  '025-k': 'pikachu-kalos-cap', '025-a': 'pikachu-alola-cap',
  '025-p': 'pikachu-partner-cap', '025-w': 'pikachu-world-cap',
};

// Gender diff form IDs in our forms.json
const GENDER_FORMS = new Set([
  'pikachu-f', 'combee-f', 'hippopotas-f', 'hippowdon-f', 'unfezant-f',
  'frillish-f', 'jellicent-f', 'pyroar-f', 'meowstic-f', 'indeedee-f',
  'basculegion-f', 'oinkologne-f',
  // Plus many others that appear in serebii with -f suffix
]);

// Build id from serebii filename
function serebiiFileToId(file) {
  const base = file.replace('.png', '');
  return base;
}

function getFormFromSerebii(numStr, suffix, fullKey) {
  // Check direct mapping first
  if (SUFFIX_TO_FORM_ID[fullKey] !== undefined) {
    const mapped = SUFFIX_TO_FORM_ID[fullKey];
    if (mapped && formById[mapped]) return formById[mapped];
  }
  
  const num = parseInt(numStr);
  
  // Try to find in forms.json by various patterns
  // Gender forms: just num + '-f'
  if (suffix === 'f') {
    // Look for gender form
    const genderForms = forms.filter(f => f.numInt === num && f.section === 'gender');
    if (genderForms.length > 0) return genderForms[0];
  }
  
  // Try prefix-based regional forms
  const prefixMap = { 'a': 'a-', 'g': 'g-', 'h': 'h-', 'p': 'p-' };
  if (prefixMap[suffix]) {
    const name = pokeByNum[num]?.en?.toLowerCase().replace(/[^a-z]/g, '') || '';
    const candidateId = prefixMap[suffix] + name;
    if (formById[candidateId]) return formById[candidateId];
    // Try partial match
    const match = forms.find(f => f.numInt === num && f.section === 'form' && f.id.startsWith(prefixMap[suffix]));
    if (match) return match;
  }
  
  return null;
}

// Build Chinese name for forms we don't have mappings for
function buildZhName(baseZh, serebiiName, suffix) {
  // Use serebii English name to construct zh fallback
  const suffixZh = {
    'f': '♀', 'a': '阿罗拉', 'g': '伽勒尔', 'h': '洗翠', 'p': '帕底亚',
  };
  if (suffixZh[suffix]) return `${baseZh} ${suffixZh[suffix]}`;
  return `${baseZh} (${serebiiName.split(' ').slice(1).join(' ')})`;
}

const timeline = [];

serebii.forEach(entry => {
  const file = entry.src.split('/').pop(); // e.g. '025-f.png'
  const base = file.replace('.png', '');
  const parts = base.split('-');
  const numStr = parts[0]; // '025'
  const num = parseInt(numStr);
  const suffix = parts.slice(1).join('-'); // 'f', 'a', 'rcberry', etc.
  const fullKey = base; // '025-f'
  const spriteUrl = SEREBII_SPRITE_BASE + file;

  const pokemon = pokeByNum[num];
  const baseZh = pokemon?.zh || '';
  const baseEn = pokemon?.en || entry.name.split(' ')[0];

  if (!suffix) {
    // Base form
    timeline.push({
      id: `poke-${num}`,
      num: String(num).padStart(4, '0'),
      numInt: num,
      zh: baseZh,
      en: baseEn,
      sprite: spriteUrl,
      section: 'main',
      isBase: true,
    });
  } else {
    // Variant form — try to find in forms.json
    const formData = getFormFromSerebii(numStr, parts[1] || suffix, fullKey);
    
    let zh, en, id;
    if (formData) {
      zh = formData.zh;
      en = formData.en;
      id = formData.id;
    } else {
      // Construct from serebii name
      zh = buildZhName(baseZh, entry.name, parts[1] || suffix);
      en = entry.name;
      id = `serebii-${base}`;
    }

    timeline.push({
      id: id || `serebii-${base}`,
      num: String(num).padStart(4, '0'),
      numInt: num,
      zh: zh || en,
      en: en,
      sprite: spriteUrl,
      section: 'main', // All inline in main timeline
      isBase: false,
      serebiiFile: file,
    });
  }
});

// Validation
const base = timeline.filter(t => t.isBase);
const variants = timeline.filter(t => !t.isBase);
const missing = variants.filter(t => t.id.startsWith('serebii-'));
console.log('Timeline total:', timeline.length);
console.log('Base forms:', base.length);
console.log('Variants:', variants.length);
console.log('Unmapped variants (serebii- id):', missing.length);
if (missing.length > 0) {
  console.log('Unmapped sample:');
  missing.slice(0, 20).forEach(m => console.log(' ', m.serebiiFile, '|', m.en, '| zh:', m.zh));
}

fs.writeFileSync('../public/data/main-timeline.json', JSON.stringify(timeline, null, 2), 'utf-8');
console.log('\nSaved data/main-timeline.json');
