/**
 * fetch-pokemon-details.cjs — Comprehensive Pokémon data pipeline
 *
 * Fetches from PokeAPI:
 *   1. Base Pokémon data (1–1025): types, stats, abilities, height, weight
 *   2. Species data: genus, flavor text, egg groups, capture rate, evolution chain
 *   3. Form variants with PokeAPI IDs (10000+): type/stat/ability differences
 *   4. Ability Chinese names
 *   5. Evolution chains
 *
 * Output: public/data/pokemon-details.json
 *
 * Usage:
 *   node scripts/fetch-pokemon-details.cjs           # Full run
 *   node scripts/fetch-pokemon-details.cjs --resume   # Resume from checkpoint
 *   node scripts/fetch-pokemon-details.cjs --forms    # Only fetch forms
 *   node scripts/fetch-pokemon-details.cjs --compile  # Skip fetching, just compile
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIG
// ============================================================
const API_BASE = 'https://pokeapi.co/api/v2';
const MAX_POKEMON = 1025;
const BATCH_SIZE = 5;        // Pokémon per batch
const BATCH_DELAY_MS = 1200; // ms between batches (~250 req/min)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

const CACHE_DIR = path.join(__dirname, '../.cache');
const CHECKPOINT_FILE = path.join(CACHE_DIR, 'pokemon-checkpoint.json');
const ABILITIES_CACHE = path.join(CACHE_DIR, 'abilities-cache.json');
const EVO_CACHE = path.join(CACHE_DIR, 'evo-chains-cache.json');
const FORMS_CACHE = path.join(CACHE_DIR, 'forms-cache.json');
const OUTPUT_FILE = path.join(__dirname, '../public/data/pokemon-details.json');

// ============================================================
// STATIC TRANSLATIONS
// ============================================================
const TYPE_DATA = {
  normal:   { zh: '一般', color: '#A8A77A' },
  fire:     { zh: '火',   color: '#EE8130' },
  water:    { zh: '水',   color: '#6390F0' },
  grass:    { zh: '草',   color: '#7AC74C' },
  electric: { zh: '电',   color: '#F7D02C' },
  ice:      { zh: '冰',   color: '#96D9D6' },
  fighting: { zh: '格斗', color: '#C22E28' },
  poison:   { zh: '毒',   color: '#A33EA1' },
  ground:   { zh: '地面', color: '#E2BF65' },
  flying:   { zh: '飞行', color: '#A98FF3' },
  psychic:  { zh: '超能力', color: '#F95587' },
  bug:      { zh: '虫',   color: '#A6B91A' },
  rock:     { zh: '岩石', color: '#B6A136' },
  ghost:    { zh: '幽灵', color: '#735797' },
  dragon:   { zh: '龙',   color: '#6F35FC' },
  dark:     { zh: '恶',   color: '#705746' },
  steel:    { zh: '钢',   color: '#B7B7CE' },
  fairy:    { zh: '妖精', color: '#D685AD' },
};

const EGG_GROUP_ZH = {
  monster:      '怪兽',
  water1:       '水中1',
  water2:       '水中2',
  water3:       '水中3',
  bug:          '虫',
  mineral:      '矿物',
  flying:       '飞行',
  amorphous:    '不定形',
  field:        '陆上',
  fairy:        '妖精',
  ditto:        '百变怪',
  plant:        '植物',
  'human-like': '人型',
  dragon:       '龙',
  'no-eggs':    '未发现',
};

const STAT_NAMES = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

// ============================================================
// HELPERS
// ============================================================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

function saveJSON(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) {
        console.error(`  ✗ Failed after ${retries} attempts: ${url} — ${err.message}`);
        return null;
      }
      console.warn(`  ⚠ Attempt ${attempt}/${retries} failed for ${url}, retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

function extractSpeciesId(url) {
  const m = url.match(/\/pokemon-species\/(\d+)\//);
  return m ? parseInt(m[1]) : null;
}

function extractChainId(url) {
  const m = url.match(/\/evolution-chain\/(\d+)\//);
  return m ? parseInt(m[1]) : null;
}

function parseGeneration(genStr) {
  if (!genStr) return 0;
  const roman = genStr.replace('generation-', '');
  const map = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };
  return map[roman] || 0;
}

// ============================================================
// PHASE 1: Fetch base Pokémon + Species data
// ============================================================
async function fetchBasePokemon(resumeFrom = 1) {
  const checkpoint = loadJSON(CHECKPOINT_FILE) || {};
  let fetched = Object.keys(checkpoint).length;
  const abilitySet = new Set();

  // Collect existing abilities
  Object.values(checkpoint).forEach(p => {
    if (p.abilities) p.abilities.forEach(a => abilitySet.add(a));
    if (p.hiddenAbility) abilitySet.add(p.hiddenAbility);
  });

  console.log(`\n📦 Phase 1: Fetching base Pokémon data (${resumeFrom}–${MAX_POKEMON})`);
  console.log(`   ${fetched} already cached\n`);

  for (let i = resumeFrom; i <= MAX_POKEMON; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE - 1, MAX_POKEMON);
    const batchIds = [];
    for (let id = i; id <= batchEnd; id++) {
      if (checkpoint[id]) continue;
      batchIds.push(id);
    }
    if (!batchIds.length) continue;

    process.stdout.write(`  Batch ${i}–${batchEnd}... `);

    const results = await Promise.all(
      batchIds.map(async (id) => {
        const [pokemon, species] = await Promise.all([
          fetchJSON(`${API_BASE}/pokemon/${id}`),
          fetchJSON(`${API_BASE}/pokemon-species/${id}`),
        ]);
        return { id, pokemon, species };
      })
    );

    for (const { id, pokemon, species } of results) {
      if (!pokemon || !species) {
        console.warn(`\n  ⚠ Missing data for #${id}`);
        continue;
      }

      const types = pokemon.types
        .sort((a, b) => a.slot - b.slot)
        .map(t => t.type.name);

      const stats = STAT_NAMES.map(name => {
        const s = pokemon.stats.find(st => st.stat.name === name);
        return s ? s.base_stat : 0;
      });

      const abilities = pokemon.abilities
        .filter(a => !a.is_hidden)
        .map(a => a.ability.name);

      const hiddenAbility = pokemon.abilities
        .find(a => a.is_hidden)?.ability.name || null;

      abilities.forEach(a => abilitySet.add(a));
      if (hiddenAbility) abilitySet.add(hiddenAbility);

      // Chinese genus
      const genusEntry = species.genera?.find(g => g.language.name === 'zh-hans')
        || species.genera?.find(g => g.language.name === 'zh-hant');
      const genus = genusEntry?.genus || '';

      // Chinese flavor text (prefer latest game versions)
      const flavorEntries = (species.flavor_text_entries || [])
        .filter(f => f.language.name === 'zh-hans' || f.language.name === 'zh-hant');
      const flavor = (flavorEntries[flavorEntries.length - 1]?.flavor_text || '')
        .replace(/\n/g, ' ').replace(/\f/g, ' ').trim();

      const eggGroups = species.egg_groups?.map(eg => eg.name) || [];
      const evoChainUrl = species.evolution_chain?.url || null;
      const evoChainId = evoChainUrl ? extractChainId(evoChainUrl) : null;

      checkpoint[id] = {
        types,
        stats,
        abilities,
        hiddenAbility,
        height: pokemon.height,   // decimeters
        weight: pokemon.weight,   // hectograms
        genus,
        flavor,
        eggGroups,
        captureRate: species.capture_rate,
        genderRate: species.gender_rate,
        isLegendary: species.is_legendary || false,
        isMythical: species.is_mythical || false,
        generation: parseGeneration(species.generation?.name),
        evoChainId,
        baseExp: pokemon.base_experience,
      };
      fetched++;
    }

    process.stdout.write(`done (${fetched}/${MAX_POKEMON})\n`);
    saveJSON(CHECKPOINT_FILE, checkpoint);
    await sleep(BATCH_DELAY_MS);
  }

  console.log(`\n  ✓ Phase 1 complete: ${fetched} Pokémon cached`);
  console.log(`  Found ${abilitySet.size} unique abilities\n`);

  return { checkpoint, abilities: [...abilitySet] };
}

// ============================================================
// PHASE 2: Fetch ability Chinese names
// ============================================================
async function fetchAbilities(abilityNames) {
  const cache = loadJSON(ABILITIES_CACHE) || {};
  const toFetch = abilityNames.filter(name => !cache[name]);

  console.log(`🔤 Phase 2: Fetching ability translations`);
  console.log(`   ${Object.keys(cache).length} cached, ${toFetch.length} to fetch\n`);

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE * 2) {
    const batch = toFetch.slice(i, i + BATCH_SIZE * 2);
    process.stdout.write(`  Abilities ${i + 1}–${Math.min(i + batch.length, toFetch.length)}/${toFetch.length}... `);

    const results = await Promise.all(
      batch.map(async (name) => {
        const data = await fetchJSON(`${API_BASE}/ability/${name}`);
        return { name, data };
      })
    );

    for (const { name, data } of results) {
      if (!data) {
        cache[name] = name; // fallback to English
        continue;
      }
      const zhEntry = data.names?.find(n => n.language.name === 'zh-hans')
        || data.names?.find(n => n.language.name === 'zh-hant');
      cache[name] = zhEntry?.name || name;
    }

    process.stdout.write(`done\n`);
    saveJSON(ABILITIES_CACHE, cache);
    await sleep(BATCH_DELAY_MS);
  }

  console.log(`  ✓ Phase 2 complete: ${Object.keys(cache).length} abilities\n`);
  return cache;
}

// ============================================================
// PHASE 3: Fetch evolution chains
// ============================================================
// Item name translations for evolution triggers
const ITEM_ZH = {
  'water-stone': '水之石', 'fire-stone': '火之石', 'thunder-stone': '雷之石',
  'leaf-stone': '叶之石', 'moon-stone': '月之石', 'sun-stone': '日之石',
  'shiny-stone': '光之石', 'dusk-stone': '暗之石', 'dawn-stone': '觉醒之石',
  'ice-stone': '冰之石', 'linking-cord': '连接绳', 'oval-stone': '浑圆之石',
  'razor-claw': '锐利之爪', 'razor-fang': '锐利之牙', 'protector': '护具',
  'electirizer': '电力增幅器', 'magmarizer': '熔岩增幅器', 'upgrade': '升级数据',
  'dubious-disc': '可疑光碟', 'reaper-cloth': '灵界之布', 'deep-sea-tooth': '深海之牙',
  'deep-sea-scale': '深海之鳞', 'metal-coat': '金属膜', 'kings-rock': '王者之证',
  'dragon-scale': '龙之鳞片', 'prism-scale': '美丽鳞片', 'whipped-dream': '掼奶油',
  'sachet': '香袋', 'tart-apple': '酸苹果', 'sweet-apple': '甜苹果',
  'cracked-pot': '破裂的茶壶', 'chipped-pot': '缺损的茶壶',
  'galarica-cuff': '伽勒豆蔻手环', 'galarica-wreath': '伽勒豆蔻花环',
  'black-augurite': '黑奇石', 'peat-block': '泥炭块', 'auspicious-armor': '将之铠甲',
  'malicious-armor': '咒之铠甲', 'scroll-of-darkness': '恶之卷轴',
  'scroll-of-waters': '水之卷轴', 'syrupy-apple': '糖浆苹果',
  'unremarkable-teacup': '凡作茶碗', 'masterpiece-teacup': '杰作茶碗',
  'metal-alloy': '复合金属',
};

// Held item name translations
const HELD_ITEM_ZH = {
  'kings-rock': '王者之证', 'metal-coat': '金属膜', 'dragon-scale': '龙之鳞片',
  'deep-sea-tooth': '深海之牙', 'deep-sea-scale': '深海之鳞',
  'prism-scale': '美丽鳞片', 'protector': '护具', 'electirizer': '电力增幅器',
  'magmarizer': '熔岩增幅器', 'upgrade': '升级数据', 'dubious-disc': '可疑光碟',
  'reaper-cloth': '灵界之布', 'whipped-dream': '掼奶油', 'sachet': '香袋',
  'oval-stone': '浑圆之石', 'razor-claw': '锐利之爪', 'razor-fang': '锐利之牙',
};

function flattenEvoChain(chain, speciesNames) {
  const result = [];

  function walk(node, trigger) {
    const speciesId = extractSpeciesId(node.species.url);
    const zhName = speciesNames[speciesId] || node.species.name;

    let triggerStr = null;
    if (trigger) {
      const t = trigger;
      if (t.trigger?.name === 'level-up') {
        triggerStr = t.min_level ? `Lv.${t.min_level}` : '升级';
        if (t.min_happiness) triggerStr = `亲密度≥${t.min_happiness}`;
        if (t.known_move_type) triggerStr = `学会${TYPE_DATA[t.known_move_type.name]?.zh || t.known_move_type.name}属性招式`;
        if (t.location) triggerStr = '特定地点升级';
        if (t.time_of_day === 'day') triggerStr += '(白天)';
        if (t.time_of_day === 'night') triggerStr += '(夜晚)';
      } else if (t.trigger?.name === 'trade') {
        triggerStr = '通信交换';
        if (t.held_item) {
          const itemZh = HELD_ITEM_ZH[t.held_item.name] || t.held_item.name;
          triggerStr += `(携带${itemZh})`;
        }
      } else if (t.trigger?.name === 'use-item') {
        triggerStr = ITEM_ZH[t.item?.name] || t.item?.name || '使用道具';
      } else if (t.trigger?.name === 'shed') {
        triggerStr = '蜕皮';
      } else if (t.trigger?.name === 'other') {
        triggerStr = '特殊条件';
      } else {
        triggerStr = t.trigger?.name || '进化';
      }
    }

    result.push({ id: speciesId, zh: zhName, trigger: triggerStr });

    for (const evo of (node.evolves_to || [])) {
      const detail = evo.evolution_details?.[0] || null;
      walk(evo, detail);
    }
  }

  walk(chain, null);
  return result;
}

async function fetchEvoChains(pokemonData) {
  const cache = loadJSON(EVO_CACHE) || {};

  // Collect unique chain IDs
  const chainIds = new Set();
  Object.values(pokemonData).forEach(p => {
    if (p.evoChainId) chainIds.add(p.evoChainId);
  });
  const toFetch = [...chainIds].filter(id => !cache[id]);

  console.log(`🔗 Phase 3: Fetching evolution chains`);
  console.log(`   ${Object.keys(cache).length} cached, ${toFetch.length} to fetch\n`);

  // Build species name lookup from pokemonData
  // We need zh names. Load from main-timeline + forms
  const timeline = loadJSON(path.join(__dirname, '../public/data/main-timeline.json')) || [];
  const speciesNames = {};
  // Only use base entries (isBase === true) to avoid gender variant names like "妙蛙花 ♀"
  timeline.filter(p => p.isBase).forEach(p => { speciesNames[p.numInt] = p.zh; });

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  Chains ${i + 1}–${Math.min(i + batch.length, toFetch.length)}/${toFetch.length}... `);

    const results = await Promise.all(
      batch.map(async (id) => {
        const data = await fetchJSON(`${API_BASE}/evolution-chain/${id}`);
        return { id, data };
      })
    );

    for (const { id, data } of results) {
      if (!data) {
        cache[id] = [];
        continue;
      }
      cache[id] = flattenEvoChain(data.chain, speciesNames);
    }

    process.stdout.write(`done\n`);
    saveJSON(EVO_CACHE, cache);
    await sleep(BATCH_DELAY_MS);
  }

  console.log(`  ✓ Phase 3 complete: ${Object.keys(cache).length} chains\n`);
  return cache;
}

// ============================================================
// PHASE 4: Fetch form variant data
// ============================================================
async function fetchFormVariants() {
  const cache = loadJSON(FORMS_CACHE) || {};

  // Get form IDs from forms.json that have PokeAPI numeric IDs
  const formsJson = loadJSON(path.join(__dirname, '../public/data/forms.json')) || [];
  const formEntries = [];

  for (const f of formsJson) {
    const m = f.sprite?.match(/r2\.dev\/(\d+)\.png$/);
    if (m) {
      const pokeApiId = parseInt(m[1]);
      if (pokeApiId > MAX_POKEMON) {
        formEntries.push({ entryId: f.id, pokeApiId, numInt: f.numInt });
      }
    }
  }

  // Also get form IDs from main-timeline variants
  const timeline = loadJSON(path.join(__dirname, '../public/data/main-timeline.json')) || [];
  for (const p of timeline) {
    if (p.isBase) continue;
    const m = p.sprite?.match(/r2\.dev\/(\d+)\.png$/);
    if (m) {
      const pokeApiId = parseInt(m[1]);
      if (pokeApiId > MAX_POKEMON && !formEntries.find(e => e.pokeApiId === pokeApiId)) {
        formEntries.push({ entryId: p.id, pokeApiId, numInt: p.numInt });
      }
    }
  }

  const toFetch = formEntries.filter(e => !cache[e.pokeApiId]);
  console.log(`🔀 Phase 4: Fetching form variant data`);
  console.log(`   ${Object.keys(cache).length} cached, ${toFetch.length} to fetch\n`);

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  Forms ${i + 1}–${Math.min(i + batch.length, toFetch.length)}/${toFetch.length}... `);

    const results = await Promise.all(
      batch.map(async ({ pokeApiId, numInt }) => {
        const pokemon = await fetchJSON(`${API_BASE}/pokemon/${pokeApiId}`);
        return { pokeApiId, numInt, pokemon };
      })
    );

    for (const { pokeApiId, numInt, pokemon } of results) {
      if (!pokemon) {
        // Fallback: just reference the base form
        cache[pokeApiId] = { ref: numInt };
        continue;
      }

      const types = pokemon.types
        .sort((a, b) => a.slot - b.slot)
        .map(t => t.type.name);

      const stats = STAT_NAMES.map(name => {
        const s = pokemon.stats.find(st => st.stat.name === name);
        return s ? s.base_stat : 0;
      });

      const abilities = pokemon.abilities
        .filter(a => !a.is_hidden)
        .map(a => a.ability.name);

      const hiddenAbility = pokemon.abilities
        .find(a => a.is_hidden)?.ability.name || null;

      cache[pokeApiId] = {
        types,
        stats,
        abilities,
        hiddenAbility,
        height: pokemon.height,
        weight: pokemon.weight,
        baseExp: pokemon.base_experience,
        baseRef: numInt,  // reference to base Pokémon for evo chain etc.
      };
    }

    process.stdout.write(`done\n`);
    saveJSON(FORMS_CACHE, cache);
    await sleep(BATCH_DELAY_MS);
  }

  console.log(`  ✓ Phase 4 complete: ${Object.keys(cache).length} form variants\n`);
  return cache;
}

// ============================================================
// COMPILE: Merge all data into final output
// ============================================================
function compile(pokemonData, abilities, evoChains, formData) {
  console.log('📋 Compiling final output...\n');

  const output = {
    meta: {
      types: TYPE_DATA,
      eggGroups: EGG_GROUP_ZH,
    },
    pokemon: {},
    evoChains: {},
    abilities: abilities,
  };

  // Add base Pokémon
  for (const [id, p] of Object.entries(pokemonData)) {
    output.pokemon[id] = {
      types: p.types,
      stats: p.stats,
      abilities: p.abilities,
      hiddenAbility: p.hiddenAbility,
      height: p.height,
      weight: p.weight,
      genus: p.genus,
      flavor: p.flavor,
      eggGroups: p.eggGroups,
      captureRate: p.captureRate,
      genderRate: p.genderRate,
      isLegendary: p.isLegendary,
      isMythical: p.isMythical,
      generation: p.generation,
      evoChainId: p.evoChainId,
      baseExp: p.baseExp,
    };
  }

  // Add form variants
  for (const [id, f] of Object.entries(formData)) {
    if (f.ref) {
      // Just a reference to base form, skip (UI will use base)
      continue;
    }
    output.pokemon[id] = {
      types: f.types,
      stats: f.stats,
      abilities: f.abilities,
      hiddenAbility: f.hiddenAbility,
      height: f.height,
      weight: f.weight,
      baseRef: f.baseRef,
      baseExp: f.baseExp,
    };
  }

  // Add evolution chains
  for (const [id, chain] of Object.entries(evoChains)) {
    output.evoChains[id] = chain;
  }

  // Stats summary
  const pokemonCount = Object.keys(output.pokemon).length;
  const chainCount = Object.keys(output.evoChains).length;
  const abilityCount = Object.keys(output.abilities).length;

  console.log(`  Pokémon entries: ${pokemonCount}`);
  console.log(`  Evolution chains: ${chainCount}`);
  console.log(`  Ability translations: ${abilityCount}`);

  // Write output
  const jsonStr = JSON.stringify(output);
  fs.writeFileSync(OUTPUT_FILE, jsonStr);
  const sizeKB = (Buffer.byteLength(jsonStr) / 1024).toFixed(1);
  console.log(`\n  ✓ Written to ${OUTPUT_FILE}`);
  console.log(`  File size: ${sizeKB} KB\n`);

  return output;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const isResume = args.includes('--resume');
  const isFormsOnly = args.includes('--forms');
  const isCompileOnly = args.includes('--compile');

  ensureDir(CACHE_DIR);

  if (isCompileOnly) {
    const pokemonData = loadJSON(CHECKPOINT_FILE) || {};
    const abilities = loadJSON(ABILITIES_CACHE) || {};
    const evoChains = loadJSON(EVO_CACHE) || {};
    const formData = loadJSON(FORMS_CACHE) || {};
    compile(pokemonData, abilities, evoChains, formData);
    return;
  }

  if (isFormsOnly) {
    const formData = await fetchFormVariants();
    // Also collect unique ability names from forms
    const allAbilities = new Set();
    Object.values(formData).forEach(f => {
      if (f.abilities) f.abilities.forEach(a => allAbilities.add(a));
      if (f.hiddenAbility) allAbilities.add(f.hiddenAbility);
    });
    const existingAbilities = loadJSON(ABILITIES_CACHE) || {};
    const newAbilities = [...allAbilities].filter(a => !existingAbilities[a]);
    if (newAbilities.length) {
      await fetchAbilities([...Object.keys(existingAbilities), ...newAbilities]);
    }
    console.log('Forms phase complete. Run with --compile to generate output.');
    return;
  }

  // Phase 1: Base Pokémon
  let resumeFrom = 1;
  if (isResume) {
    const existing = loadJSON(CHECKPOINT_FILE) || {};
    const ids = Object.keys(existing).map(Number).filter(n => !isNaN(n));
    if (ids.length) {
      resumeFrom = Math.max(...ids) + 1;
      console.log(`Resuming from #${resumeFrom} (${ids.length} cached)`);
    }
  }

  const { checkpoint, abilities: abilityNames } = await fetchBasePokemon(resumeFrom);

  // Phase 2: Abilities
  const abilities = await fetchAbilities(abilityNames);

  // Phase 3: Evolution chains
  const evoChains = await fetchEvoChains(checkpoint);

  // Phase 4: Form variants
  const formData = await fetchFormVariants();

  // Collect abilities from forms too
  const formAbilities = new Set();
  Object.values(formData).forEach(f => {
    if (f.abilities) f.abilities.forEach(a => formAbilities.add(a));
    if (f.hiddenAbility) formAbilities.add(f.hiddenAbility);
  });
  const newFormAbilities = [...formAbilities].filter(a => !abilities[a]);
  if (newFormAbilities.length) {
    const allAbilityNames = [...Object.keys(abilities), ...newFormAbilities];
    const updatedAbilities = await fetchAbilities(allAbilityNames);
    Object.assign(abilities, updatedAbilities);
  }

  // Compile
  compile(checkpoint, abilities, evoChains, formData);
  console.log('🎉 All done!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
