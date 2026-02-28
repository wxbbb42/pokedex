/**
 * data.js — Constants, data loading, and pure utility functions.
 * No mutable state — all state lives in React.
 */

// ============================================================
// CONSTANTS
// ============================================================
export const SYNC_ENDPOINT = '/api/pokedex-progress';
export const PROGRESS_KEY  = 'pdx_progress_v2';
export const UI_KEY        = 'pdx_ui_v1';

export const FALLBACK =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">' +
  '<rect width="60" height="60" rx="8" fill="%23333"/>' +
  '<text x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="%23666">?</text></svg>';

export const R2_BASE = 'https://pub-aa43740e9f1f450ca7cd054cdf60d907.r2.dev';

/** Derive shiny sprite URL from normal sprite. Numeric IDs have shiny versions; variants don't. */
export function getShinySprite(normalSprite) {
  if (!normalSprite || !normalSprite.startsWith(R2_BASE)) return normalSprite;
  const suffix = normalSprite.slice(R2_BASE.length + 1);
  if (/^\d+\.png$/.test(suffix)) return `${R2_BASE}/shiny/${suffix}`;
  return normalSprite;
}

export const GEN_RANGES = {
  1: [1, 151],   2: [152, 251],  3: [252, 386],
  4: [387, 493],  5: [494, 649],  6: [650, 721],
  7: [722, 809],  8: [810, 905],  9: [906, 1025],
};

export const REGION_BOXES = [
  { label: 'Kanto',  range: [1, 151] },
  { label: 'Johto',  range: [152, 251] },
  { label: 'Hoenn',  range: [252, 386] },
  { label: 'Sinnoh', range: [387, 493] },
  { label: 'Unova',  range: [494, 649] },
  { label: 'Kalos',  range: [650, 721] },
  { label: 'Alola',  range: [722, 809] },
  { label: 'Galar',  range: [810, 905] },
  { label: 'Paldea', range: [906, 1025] },
];

export const DIST_GEN_LABELS = {
  6: 'Gen 6 — XY / ORAS',
  7: 'Gen 7 — SM / USUM',
  8: 'Gen 8 — 剑盾 / BDSP / PLA',
  9: 'Gen 9 — 朱紫',
};

export const BOX_SIZE = 30;

export const SKIP_EVENT_IDS = new Set([
  'pikachu-original-cap', 'pikachu-hoenn-cap', 'pikachu-sinnoh-cap',
  'pikachu-unova-cap', 'pikachu-kalos-cap', 'pikachu-alola-cap',
  'pikachu-partner-cap', 'pikachu-world-cap',
]);

export const STAT_LABELS = ['HP', '攻击', '防御', '特攻', '特防', '速度'];
export const STAT_COLORS = ['#FF5555', '#F08030', '#F8D030', '#6890F0', '#78C850', '#F85888'];
export const MAX_STAT = 255;

// ============================================================
// HELPERS
// ============================================================
/** Get the collection key (appends _shiny when in shiny mode). */
export function getCollectionKey(id, isShiny) {
  return isShiny ? id + '_shiny' : id;
}

// ============================================================
// DATA LOADING
// ============================================================
/** Load Pokémon timeline + forms data. Returns the combined array. */
export async function fetchPokemonData() {
  const [timelineRaw, formsRaw] = await Promise.all([
    fetch('data/main-timeline.json').then(r => r.json()),
    fetch('data/forms.json').then(r => r.json()),
  ]);

  const mainList = timelineRaw.map(p => ({
    id: p.id, num: p.num, numInt: p.numInt,
    _sprite: p.sprite, zh: p.zh, en: p.en,
    section: 'main', isBase: p.isBase,
  }));

  const gmaxList = formsRaw
    .filter(f => f.section === 'gmax')
    .map(f => ({
      id: f.id, num: f.num, numInt: f.numInt || parseInt(f.num),
      _sprite: f.sprite, zh: f.zh, en: f.en, section: 'gmax',
    }));

  const eventList = formsRaw
    .filter(f => f.section === 'event' && !SKIP_EVENT_IDS.has(f.id))
    .map(f => ({
      id: f.id, num: f.num, numInt: f.numInt || parseInt(f.num),
      _sprite: f.sprite, zh: f.zh, en: f.en, section: 'event',
    }));

  return [...mainList, ...gmaxList, ...eventList];
}

/** Load detailed Pokémon data (types, stats, abilities, evo chains). */
export async function fetchPokemonDetails() {
  const r = await fetch('data/pokemon-details.json');
  if (!r.ok) return null;
  return r.json();
}

/** Load event distribution data. Returns Map<numInt, { numInt, zh, events[] }> or null. */
export async function fetchEventDistributions() {
  const r = await fetch('data/event-distributions.json');
  if (!r.ok) return null;
  const arr = await r.json();
  const map = new Map();
  for (const entry of arr) {
    map.set(entry.numInt, entry);
  }
  return map;
}

// ============================================================
// DETAIL LOOKUP (pure — takes details as param)
// ============================================================

/** Extract PokeAPI ID from a Pokémon entry. */
export function getPokeApiId(p) {
  if (p._sprite) {
    const m = p._sprite.match(/r2\.dev\/(\d+)\.png$/);
    if (m) return parseInt(m[1]);
  }
  return p.numInt || parseInt(p.num) || 0;
}

/**
 * Get detailed data for a Pokémon entry.
 * @param {Object} p - Pokémon entry
 * @param {Object|null} details - The details data object
 * @returns {Object|null}
 */
export function getDetail(p, details) {
  if (!details) return null;
  const pokeApiId = getPokeApiId(p);
  const detail = details.pokemon[pokeApiId];
  if (detail) {
    if (detail.baseRef) {
      const base = details.pokemon[detail.baseRef];
      if (base) {
        return {
          ...base, ...detail,
          genus: detail.genus || base.genus,
          flavor: detail.flavor || base.flavor,
          eggGroups: detail.eggGroups || base.eggGroups,
          captureRate: detail.captureRate ?? base.captureRate,
          genderRate: detail.genderRate ?? base.genderRate,
          isLegendary: detail.isLegendary ?? base.isLegendary,
          isMythical: detail.isMythical ?? base.isMythical,
          evoChainId: detail.evoChainId ?? base.evoChainId,
        };
      }
    }
    return detail;
  }
  const numInt = p.numInt || parseInt(p.num) || 0;
  return details.pokemon[numInt] || null;
}

/** Get evolution chain for a Pokémon detail object. */
export function getEvoChain(detail, details) {
  if (!details || !detail?.evoChainId) return null;
  return details.evoChains[detail.evoChainId] || null;
}

/** Get Chinese name for an ability. */
export function getAbilityZh(abilityName, details) {
  if (!details) return abilityName;
  return details.abilities[abilityName] || abilityName;
}

// ============================================================
// FILTERING (pure — takes params)
// ============================================================
export function getVisibleLists(pokemonData, activeGen) {
  const isGenNumber = activeGen !== 'all' && activeGen !== 'gmax'
    && activeGen !== 'event' && activeGen !== 'distributions';

  let main = pokemonData.filter(p => p.section === 'main');
  if (isGenNumber) {
    const rng = GEN_RANGES[+activeGen];
    main = rng ? main.filter(p => p.numInt >= rng[0] && p.numInt <= rng[1]) : [];
  } else if (activeGen === 'gmax' || activeGen === 'event' || activeGen === 'distributions') {
    main = [];
  }

  const gmax = (activeGen === 'all' || activeGen === 'gmax')
    ? pokemonData.filter(p => p.section === 'gmax') : [];

  const event = (activeGen === 'all' || activeGen === 'event')
    ? pokemonData.filter(p => p.section === 'event') : [];

  return { main, gmax, event };
}

/** Check if a card passes the current filter + search criteria. */
export function isCardVisible(p, { searchQuery, filterMode, filterType, collected, isShiny, details }) {
  const key = getCollectionKey(p.id, isShiny);

  // Collection filter
  if (filterMode === 'collected' && !collected.has(key)) return false;
  if (filterMode === 'uncollected' && collected.has(key)) return false;

  // Type filter
  if (filterType) {
    const detail = getDetail(p, details);
    if (!detail?.types?.includes(filterType)) return false;
  }

  // Search filter
  if (searchQuery) {
    const q = searchQuery.trim().toLowerCase();
    if (q && !(p.zh || '').toLowerCase().includes(q) && !(p.en || '').toLowerCase().includes(q)) {
      return false;
    }
  }

  return true;
}
