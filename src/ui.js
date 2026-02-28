/**
 * ui.js — Card creation, rendering, popover, search, progress.
 */
import {
  FALLBACK, GEN_RANGES, REGION_BOXES, BOX_SIZE, R2_BASE,
  state, getVisibleLists, getShinySprite,
  getDetail, getEvoChain, getAbilityZh,
} from './data.js';
import { saveLocal, saveUIState, scheduleSyncRemote } from './storage.js';

// ============================================================
// PROGRESS
// ============================================================
export function updateProgress() {
  const isShiny = document.body.classList.contains('shiny');
  const { main, gmax, event } = getVisibleLists();
  const relevant = [...main, ...gmax, ...event];
  const total = relevant.length;
  let have = 0;
  relevant.forEach(p => {
    const key = isShiny ? p.id + '_shiny' : p.id;
    if (state.collected.has(key)) have++;
  });
  document.getElementById('progress-text').textContent = `已收集 ${have} / ${total}`;
  document.getElementById('progress-bar').style.width = total ? (have / total * 100) + '%' : '0%';
}

// ============================================================
// CARDS
// ============================================================
function getCurrentKey(p) {
  return document.body.classList.contains('shiny') ? p.id + '_shiny' : p.id;
}

function makeCard(p) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.baseId = p.id;
  card.dataset.zh = (p.zh || '').toLowerCase();
  card.dataset.en = (p.en || '').toLowerCase();
  card.setAttribute('role', 'button');
  card.tabIndex = 0;
  card.setAttribute(
    'aria-label',
    `${p.zh || p.en || ''} #${String(p.numInt || parseInt(p.num) || 0).padStart(4, '0')}`.trim(),
  );

  const num = document.createElement('div');
  num.className = 'num';
  num.textContent = '#' + String(p.numInt || parseInt(p.num) || 0).padStart(4, '0');

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = p.en || '';
  img.src = p._sprite || FALLBACK;
  img.addEventListener('error', () => { img.src = FALLBACK; });

  const zh = document.createElement('div');
  zh.className = 'name-zh';
  zh.textContent = p.zh || '';

  const en = document.createElement('div');
  en.className = 'name-en';
  en.textContent = p.en || '';

  card.appendChild(num);
  card.appendChild(img);
  card.appendChild(zh);
  card.appendChild(en);

  card.addEventListener('click', () => openPopover(p, getCurrentKey(p)));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPopover(p, getCurrentKey(p));
    }
  });
  return card;
}

export function syncCardState(card, p, isShiny) {
  const key = isShiny ? p.id + '_shiny' : p.id;
  card.dataset.id = key;
  card.classList.toggle('collected', state.collected.has(key));
  const img = card.querySelector('img');
  if (img) {
    img.src = isShiny ? (getShinySprite(p._sprite) || FALLBACK) : (p._sprite || FALLBACK);
  }
}

function getCard(p) {
  if (state.cardCache.has(p.id)) return state.cardCache.get(p.id);
  const card = makeCard(p);
  state.cardCache.set(p.id, card);
  return card;
}

function updateCard(id) {
  const baseId = id.replace(/_shiny$/, '');
  const card = state.cardCache.get(baseId);
  if (!card) return;
  const isShiny = document.body.classList.contains('shiny');
  const p = state.pokemonData.find(x => x.id === baseId);
  if (!p) return;
  syncCardState(card, p, isShiny);
}

// ============================================================
// RENDERING
// ============================================================
export function renderCards() {
  const isShiny = document.body.classList.contains('shiny');
  if (state.viewMode === 'box') { renderBoxView(isShiny); return; }

  const gm = document.getElementById('grid-main');
  const gx = document.getElementById('grid-gmax');
  const ge = document.getElementById('grid-event');
  gm.innerHTML = ''; gx.innerHTML = ''; ge.innerHTML = '';

  const { main, gmax, event } = getVisibleLists();
  const mainFrag  = document.createDocumentFragment();
  const gmaxFrag  = document.createDocumentFragment();
  const eventFrag = document.createDocumentFragment();

  main.forEach(p => { const c = getCard(p); syncCardState(c, p, isShiny); mainFrag.appendChild(c); });
  gmax.forEach(p => { const c = getCard(p); syncCardState(c, p, isShiny); gmaxFrag.appendChild(c); });
  event.forEach(p => { const c = getCard(p); syncCardState(c, p, isShiny); eventFrag.appendChild(c); });

  gm.appendChild(mainFrag);
  gx.appendChild(gmaxFrag);
  ge.appendChild(eventFrag);

  document.getElementById('section-gmax').style.display = gmax.length ? '' : 'none';
  document.getElementById('grid-gmax').style.display    = gmax.length ? '' : 'none';
  document.getElementById('section-event').style.display = event.length ? '' : 'none';
  document.getElementById('grid-event').style.display    = event.length ? '' : 'none';

  applySearch();
}

function makeBoxSection(container, title, items, labelPrefix, isShiny) {
  if (!items.length) return;

  let boxNum = 1;
  for (let i = 0; i < items.length; i += BOX_SIZE) {
    const chunk = items.slice(i, i + BOX_SIZE);
    const wrapper = document.createElement('div');
    wrapper.className = 'box-wrapper';

    const lbl = document.createElement('div');
    lbl.className = 'box-label';
    lbl.textContent = items.length > BOX_SIZE ? labelPrefix + ' ' + (boxNum++) : labelPrefix;
    wrapper.appendChild(lbl);

    const grid = document.createElement('div');
    grid.className = 'box-grid';
    for (let s = 0; s < BOX_SIZE; s++) {
      if (s < chunk.length) {
        const p = chunk[s];
        const card = getCard(p);
        syncCardState(card, p, isShiny);
        grid.appendChild(card);
      } else {
        const e = document.createElement('div');
        e.className = 'card empty';
        grid.appendChild(e);
      }
    }
    wrapper.appendChild(grid);
    container.appendChild(wrapper);
  }
}

function renderBoxView(isShiny) {
  const container = document.getElementById('boxes-container');
  container.innerHTML = '';

  const { main, gmax, event } = getVisibleLists();

  const regions = (state.activeGen === 'all' || state.activeGen === 'gmax' || state.activeGen === 'event')
    ? REGION_BOXES
    : REGION_BOXES.filter(r => {
        const rng = GEN_RANGES[+state.activeGen];
        return rng && r.range[0] >= rng[0] && r.range[1] <= rng[1];
      });

  for (const region of regions) {
    const rp = main.filter(p => p.numInt >= region.range[0] && p.numInt <= region.range[1]);
    if (!rp.length) continue;
    makeBoxSection(container, region.label, rp, region.label, isShiny);
  }

  if (gmax.length) makeBoxSection(container, '⚡ 超极巨化（Gigantamax）', gmax, 'Gmax', isShiny);
  if (event.length) makeBoxSection(container, '🌟 配信 & 神话宝可梦', event, 'Event', isShiny);

  applySearch();
}

// ============================================================
// SEARCH
// ============================================================
export function applySearch() {
  const q = state.searchQuery.trim().toLowerCase();
  for (const card of state.cardCache.values()) {
    if (!q) { card.classList.remove('search-hidden', 'search-match'); continue; }
    const match = (card.dataset.zh || '').includes(q) || (card.dataset.en || '').includes(q);
    card.classList.toggle('search-hidden', !match);
    card.classList.toggle('search-match', match);
  }
}

// ============================================================
// STAT BAR CONSTANTS
// ============================================================
const STAT_LABELS = ['HP', '攻击', '防御', '特攻', '特防', '速度'];
const STAT_COLORS = ['#FF5555', '#F08030', '#F8D030', '#6890F0', '#78C850', '#F85888'];
const MAX_STAT = 255; // Max possible single stat

// ============================================================
// POPOVER
// ============================================================
let popoverCurrentId = null;
let popoverCurrentEntry = null;

export function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build type badge HTML for given type names.
 */
function renderTypeBadges(types) {
  if (!state.details || !types?.length) return '';
  const meta = state.details.meta.types;
  return types.map(t => {
    const info = meta[t] || { zh: t, color: '#999' };
    return `<span class="type-badge" style="background:${esc(info.color)}">${esc(info.zh)}</span>`;
  }).join('');
}

/**
 * Build stat bars HTML.
 */
function renderStatBars(stats) {
  if (!stats?.length) return '';
  const total = stats.reduce((sum, v) => sum + v, 0);
  const bars = stats.map((val, i) => {
    const pct = Math.min(val / MAX_STAT * 100, 100);
    return `<div class="stat-row">
      <span class="stat-label">${STAT_LABELS[i]}</span>
      <span class="stat-value">${val}</span>
      <div class="stat-bar-bg">
        <div class="stat-bar-fill" style="width:${pct}%;background:${STAT_COLORS[i]}"></div>
      </div>
    </div>`;
  }).join('');
  return bars;
}

/**
 * Build ability tags HTML.
 */
function renderAbilities(detail) {
  if (!detail) return '';
  const tags = [];
  for (const a of (detail.abilities || [])) {
    tags.push(`<span class="ability-tag">${esc(getAbilityZh(a))}</span>`);
  }
  if (detail.hiddenAbility) {
    tags.push(`<span class="ability-tag hidden-ability">${esc(getAbilityZh(detail.hiddenAbility))}<small>隐藏</small></span>`);
  }
  return tags.join('');
}

/**
 * Build evolution chain HTML with mini sprites.
 */
function renderEvoChain(chain) {
  if (!chain?.length || chain.length <= 1) return '';
  return chain.map((stage, i) => {
    const sprite = stage.id ? `${R2_BASE}/${stage.id}.png` : '';
    const trigger = stage.trigger
      ? `<span class="evo-trigger">${esc(stage.trigger)}</span>`
      : '';
    const arrow = i > 0 ? '<span class="evo-arrow">→</span>' : '';
    return `${arrow}<div class="evo-stage">
      ${sprite ? `<img src="${esc(sprite)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
      <span class="evo-name">${esc(stage.zh || '')}</span>
      ${trigger}
    </div>`;
  }).join('');
}

function openPopover(p, key) {
  popoverCurrentId = key;
  popoverCurrentEntry = p;
  const isShiny = document.body.classList.contains('shiny');
  const sprite = isShiny ? (getShinySprite(p._sprite) || FALLBACK) : (p._sprite || FALLBACK);

  // Basic info (always available)
  document.getElementById('popover-sprite').src = sprite;
  document.getElementById('popover-num').textContent =
    '#' + String(p.numInt || parseInt(p.num) || 0).padStart(4, '0');
  document.getElementById('popover-zh').textContent = p.zh || '';
  document.getElementById('popover-en').textContent = p.en || '';

  const sectionMap = { main: '全国图鉴', gmax: '⚡ 超极巨化', event: '🌟 配信特殊' };
  document.getElementById('popover-section').textContent = sectionMap[p.section] || p.section;

  // Rich detail info
  const detail = getDetail(p);
  const hasDetail = !!detail;

  // Types
  const typesEl = document.getElementById('popover-types');
  typesEl.innerHTML = hasDetail ? renderTypeBadges(detail.types) : '';

  // Genus
  const genusEl = document.getElementById('popover-genus');
  genusEl.textContent = hasDetail && detail.genus ? detail.genus : '';
  genusEl.style.display = hasDetail && detail.genus ? '' : 'none';

  // Legendary/Mythical badge
  const sectionBadge = document.getElementById('popover-section-badge');
  if (hasDetail && (detail.isLegendary || detail.isMythical)) {
    const label = detail.isMythical ? '幻之宝可梦' : '传说宝可梦';
    sectionBadge.querySelector('span').textContent = label;
    sectionBadge.classList.add('legendary');
  } else {
    sectionBadge.querySelector('span').textContent = sectionMap[p.section] || p.section;
    sectionBadge.classList.remove('legendary');
  }

  // Physical info
  const physSection = document.getElementById('popover-physical');
  if (hasDetail) {
    document.getElementById('popover-height').textContent =
      detail.height != null ? (detail.height / 10).toFixed(1) + ' m' : '—';
    document.getElementById('popover-weight').textContent =
      detail.weight != null ? (detail.weight / 10).toFixed(1) + ' kg' : '—';
    document.getElementById('popover-capture').textContent =
      detail.captureRate != null ? String(detail.captureRate) : '—';
    physSection.style.display = '';
  } else {
    physSection.style.display = 'none';
  }

  // Abilities
  const abilitiesSection = document.getElementById('popover-abilities-section');
  const abilitiesEl = document.getElementById('popover-abilities');
  if (hasDetail && (detail.abilities?.length || detail.hiddenAbility)) {
    abilitiesEl.innerHTML = renderAbilities(detail);
    abilitiesSection.style.display = '';
  } else {
    abilitiesSection.style.display = 'none';
  }

  // Stats
  const statsSection = document.getElementById('popover-stats-section');
  const statsEl = document.getElementById('popover-stats');
  const totalEl = document.getElementById('popover-stats-total');
  if (hasDetail && detail.stats?.length) {
    statsEl.innerHTML = renderStatBars(detail.stats);
    const total = detail.stats.reduce((s, v) => s + v, 0);
    totalEl.textContent = `合计: ${total}`;
    statsSection.style.display = '';
  } else {
    statsSection.style.display = 'none';
  }

  // Evolution chain
  const evoSection = document.getElementById('popover-evo-section');
  const evoEl = document.getElementById('popover-evo-chain');
  const chain = hasDetail ? getEvoChain(detail) : null;
  if (chain?.length > 1) {
    evoEl.innerHTML = renderEvoChain(chain);
    evoSection.style.display = '';
  } else {
    evoSection.style.display = 'none';
  }

  // Flavor text
  const flavorSection = document.getElementById('popover-flavor-section');
  const flavorEl = document.getElementById('popover-flavor');
  if (hasDetail && detail.flavor) {
    flavorEl.textContent = detail.flavor;
    flavorSection.style.display = '';
  } else {
    flavorSection.style.display = 'none';
  }

  refreshPopoverBtn();

  const overlay = document.getElementById('popover-overlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  state.lastFocus = document.activeElement;
  document.getElementById('popover-close').focus();
  document.body.style.overflow = 'hidden';
}

function refreshPopoverBtn() {
  const btn = document.getElementById('popover-collect-btn');
  const owned = state.collected.has(popoverCurrentId);
  btn.textContent = owned ? '✓ 已收集' : '＋ 标记已收集';
  btn.classList.toggle('owned', owned);
}

export function closePopover() {
  const overlay = document.getElementById('popover-overlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
  state.lastFocus = null;
  popoverCurrentId = null;
  popoverCurrentEntry = null;
}

export function initPopoverListeners() {
  document.getElementById('popover-close').addEventListener('click', closePopover);
  document.getElementById('popover-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('popover-overlay')) closePopover();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePopover(); });

  document.getElementById('popover-collect-btn').addEventListener('click', () => {
    if (!popoverCurrentId) return;
    state.collected.has(popoverCurrentId)
      ? state.collected.delete(popoverCurrentId)
      : state.collected.add(popoverCurrentId);
    updateCard(popoverCurrentId);
    refreshPopoverBtn();
    updateProgress();
    saveLocal();
    scheduleSyncRemote();
  });
}
