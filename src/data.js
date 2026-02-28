/**
 * data.js — Constants, data loading, and filtering logic.
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
  const suffix = normalSprite.slice(R2_BASE.length + 1); // e.g. "1.png" or "variant/a-rattata.png"
  // Only numeric sprites (e.g. "123.png") have shiny versions
  if (/^\d+\.png$/.test(suffix)) return `${R2_BASE}/shiny/${suffix}`;
  return normalSprite; // variants — no shiny available
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

export const BOX_SIZE = 30;

export const SKIP_EVENT_IDS = new Set([
  'pikachu-original-cap', 'pikachu-hoenn-cap', 'pikachu-sinnoh-cap',
  'pikachu-unova-cap', 'pikachu-kalos-cap', 'pikachu-alola-cap',
  'pikachu-partner-cap', 'pikachu-world-cap',
]);

// ============================================================
// STATE
// ============================================================
export const state = {
  pokemonData: [],
  collected: new Set(),
  activeGen: 'all',
  viewMode: 'list',
  searchQuery: '',
  syncTimer: null,
  lastFocus: null,
  cardCache: new Map(),
  /** @type {{ meta: Object, pokemon: Object, evoChains: Object, abilities: Object } | null} */
  details: null,
};

// ============================================================
// DATA LOADING
// ============================================================
export async function loadPokemonData() {
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

  state.pokemonData = [...mainList, ...gmaxList, ...eventList];

  // Load detailed Pokémon data (non-blocking — UI works without it)
  fetch('data/pokemon-details.json')
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (d) state.details = d; })
    .catch(() => { /* details are optional — popover still works with basic info */ });
}

// ============================================================
// DETAIL LOOKUP
// ============================================================

/**
 * Extract PokeAPI ID from a Pokémon entry.
 * Base entries: numInt (1–1025). Forms with R2 numeric sprites: that number.
 * @param {Object} p - Pokémon entry from state.pokemonData
 * @returns {number}
 */
export function getPokeApiId(p) {
  if (p._sprite) {
    const m = p._sprite.match(/r2\.dev\/(\d+)\.png$/);
    if (m) return parseInt(m[1]);
  }
  return p.numInt || parseInt(p.num) || 0;
}

/**
 * Get detailed data for a Pokémon entry.
 * Falls back to base form data if form-specific data isn't available.
 * @param {Object} p - Pokémon entry
 * @returns {Object|null} Detail object with types, stats, abilities, etc.
 */
export function getDetail(p) {
  if (!state.details) return null;
  const pokeApiId = getPokeApiId(p);
  const detail = state.details.pokemon[pokeApiId];
  if (detail) {
    // If this is a form entry, fill in missing fields from base
    if (detail.baseRef) {
      const base = state.details.pokemon[detail.baseRef];
      if (base) {
        return {
          ...base,
          ...detail,
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
  // Fall back to base form by numInt
  const numInt = p.numInt || parseInt(p.num) || 0;
  return state.details.pokemon[numInt] || null;
}

/**
 * Get the evolution chain for a Pokémon.
 * @param {Object} detail - Detail object from getDetail()
 * @returns {Array|null}
 */
export function getEvoChain(detail) {
  if (!state.details || !detail?.evoChainId) return null;
  return state.details.evoChains[detail.evoChainId] || null;
}

/**
 * Get Chinese name for an ability.
 * @param {string} abilityName - English ability name
 * @returns {string} Chinese name or original English
 */
export function getAbilityZh(abilityName) {
  if (!state.details) return abilityName;
  return state.details.abilities[abilityName] || abilityName;
}

// ============================================================
// FILTERING
// ============================================================
export function getVisibleLists() {
  const { activeGen, pokemonData } = state;
  const isGenNumber = activeGen !== 'all' && activeGen !== 'gmax' && activeGen !== 'event';

  let main = pokemonData.filter(p => p.section === 'main');
  if (isGenNumber) {
    const rng = GEN_RANGES[+activeGen];
    main = rng ? main.filter(p => p.numInt >= rng[0] && p.numInt <= rng[1]) : [];
  } else if (activeGen === 'gmax' || activeGen === 'event') {
    main = [];
  }

  const gmax = (activeGen === 'all' || activeGen === 'gmax')
    ? pokemonData.filter(p => p.section === 'gmax')
    : [];

  const event = (activeGen === 'all' || activeGen === 'event')
    ? pokemonData.filter(p => p.section === 'event')
    : [];

  return { main, gmax, event };
}
