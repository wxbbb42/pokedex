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
