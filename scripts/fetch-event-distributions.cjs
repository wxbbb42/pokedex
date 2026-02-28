/**
 * fetch-event-distributions.cjs
 *
 * Fetches event/distribution Pokémon data from 52poke wiki (神奇宝贝百科).
 * Uses direct page HTML fetch (the MediaWiki API is blocked).
 * Properly handles rowspan/colspan in wiki tables.
 *
 * Usage: node scripts/fetch-event-distributions.cjs
 *        node scripts/fetch-event-distributions.cjs --gen 8   (single gen)
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// ============================================================
// CONFIG
// ============================================================

const WIKI_BASE = 'https://wiki.52poke.com/wiki/';
// Note: gens 1-5 only have category pages on 52poke (no structured tables),
// so we only scrape gens 6-9 which have proper list pages.
const GENERATIONS = [
  { gen: 6, title: '活动赠送宝可梦列表（第六世代）' },
  { gen: 7, title: '活动赠送宝可梦列表（第七世代）' },
  { gen: 8, title: '活动赠送宝可梦列表（第八世代）' },
  { gen: 9, title: '活动赠送宝可梦列表（第九世代）' },
];

const OUTPUT = path.join(__dirname, '..', 'public', 'data', 'event-distributions.json');
const POKEMON_JSON = path.join(__dirname, '..', 'public', 'data', 'pokemon.json');
const CACHE_DIR = path.join(__dirname, '..', '.cache');
const DELAY_MS = 2000;

// ============================================================
// HELPERS
// ============================================================

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Build a zh-name → numInt lookup from pokemon.json */
function buildNameMap() {
  const pokemon = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf-8'));
  const map = new Map();
  for (const p of pokemon) {
    if (p.zh) map.set(p.zh, p.id);
  }
  return map;
}

/** Fetch a wiki page as full HTML (direct, not via API) */
async function fetchWikiPage(title) {
  const safeName = title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_');
  const cacheFile = path.join(CACHE_DIR, `wiki-${safeName}.html`);

  // 24h cache
  if (fs.existsSync(cacheFile)) {
    const age = (Date.now() - fs.statSync(cacheFile).mtimeMs) / 3600000;
    if (age < 24) {
      console.log(`  [cache] ${title}`);
      return fs.readFileSync(cacheFile, 'utf-8');
    }
  }

  const url = WIKI_BASE + encodeURIComponent(title);
  console.log(`  [fetch] ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LivingPokedexTracker/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${title}`);
  const html = await res.text();

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, html, 'utf-8');
  return html;
}

/** Clean text: collapse whitespace, trim */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** Strip form/parenthesised suffixes to get base species */
function getBaseSpecies(name) {
  return name
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s*♂.*$/g, '')
    .replace(/\s*♀.*$/g, '')
    .trim();
}

/** Map method text to a short category */
function classifyMethod(text) {
  if (!text) return '其他';
  if (/序列号|密语|密碼|シリアル/.test(text)) return '序列号';
  if (/互联网|网络|在线|網路|インターネット/.test(text)) return '网络配信';
  if (/现场|會場|配布|店頭/.test(text)) return '现场配信';
  if (/Wi-Fi/.test(text)) return 'Wi-Fi';
  if (/HOME/.test(text)) return 'HOME';
  if (/神秘礼物|ふしぎなおくりもの/.test(text)) return '神秘礼物';
  if (/红外线|赤外線/.test(text)) return '红外线';
  if (/宝可梦中心|ポケモンセンター|Pokémon Center/.test(text)) return '宝可梦中心';
  if (/竞技场|对战|バトル/.test(text)) return '对战奖励';
  return '其他';
}

// ============================================================
// TABLE EXPANDER  (handles rowspan + colspan)
// ============================================================

/**
 * Expand a <table> into a 2-D string grid, resolving rowspan/colspan.
 * Returns { grid: string[][], rawCells: cheerio[][] }
 */
function expandTable($, $table) {
  const grid = [];       // grid[row][col] = text
  const occupied = [];   // occupied[row][col] = true if filled by a prior span
  const rows = $table.find('> thead > tr, > tbody > tr, > tr').toArray();

  for (let ri = 0; ri < rows.length; ri++) {
    if (!grid[ri]) grid[ri] = [];
    if (!occupied[ri]) occupied[ri] = [];

    const cells = $(rows[ri]).find('> td, > th').toArray();
    let gi = 0; // grid column cursor

    for (const cell of cells) {
      while (occupied[ri][gi]) gi++;

      const $c = $(cell);
      const rs = parseInt($c.attr('rowspan')) || 1;
      const cs = parseInt($c.attr('colspan')) || 1;
      const text = clean($c.text());

      for (let dr = 0; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) {
          const r = ri + dr, c = gi + dc;
          if (!grid[r]) grid[r] = [];
          if (!occupied[r]) occupied[r] = [];
          grid[r][c] = text;
          if (dr > 0 || dc > 0) occupied[r][c] = true;
        }
      }
      // Mark future-row cells as occupied
      for (let dr = 1; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) {
          if (!occupied[ri + dr]) occupied[ri + dr] = [];
          occupied[ri + dr][gi + dc] = true;
        }
      }
      gi += cs;
    }
  }
  return grid;
}

// ============================================================
// PAGE PARSER
// ============================================================

function parseGenPage(html, gen, nameMap) {
  const $ = cheerio.load(html);
  const events = [];

  // Content sits inside #mw-content-text .mw-parser-output
  const $content = $('#mw-content-text .mw-parser-output');
  if (!$content.length) {
    console.log('  [warn] no .mw-parser-output found');
    return events;
  }

  // Walk top-level children to track section headings
  let currentHeading = '';

  // Collect heading → table mapping by iterating all children
  const elements = $content.children().toArray();
  for (const el of elements) {
    const $el = $(el);
    const tag = (el.tagName || '').toLowerCase();

    // Track headings (h2, h3, h4)
    if (/^h[2-4]$/.test(tag)) {
      currentHeading = clean($el.text()).replace(/\[编辑\]/g, '').replace(/\[編輯\]/g, '').trim();
      continue;
    }

    if (tag !== 'table') continue;

    const grid = expandTable($, $el);
    if (grid.length < 2) continue;

    // Detect event table by header keywords
    const headerRow = grid[0] || [];
    const hStr = headerRow.join('|');
    const isPokemonCol = /宝可梦|寶可夢/.test(hStr);
    const isOTCol = /初训家|初訓家|ID/.test(hStr);
    if (!isPokemonCol || !isOTCol) continue;

    // Map column indices
    const COL = {};
    for (let i = 0; i < headerRow.length; i++) {
      const h = headerRow[i];
      if (/宝可梦|寶可夢/.test(h)) COL.pokemon = i;
      if (/初训家|初訓家/.test(h)) COL.ot = i;
      if (/ID/.test(h) && COL.id === undefined) COL.id = i;
      if (/等级|等級/.test(h)) COL.level = i;
      if (/接收时间|接收時間/.test(h)) COL.date = i;
      if (/接收方法|接收方式/.test(h)) COL.method = i;
      if (/接收版本|接收版/.test(h)) COL.games = i;
    }
    if (COL.pokemon === undefined) continue;

    // Determine game from heading
    const gameContext = detectGame(currentHeading);

    // Parse data rows
    let currentYear = '';
    for (let ri = 1; ri < grid.length; ri++) {
      const row = grid[ri];
      if (!row || row.length < 3) continue;

      // Year separator?
      const first = (row[0] || '').trim();
      if (/^\d{4}年?$/.test(first) && row.filter(c => c && c.trim()).length <= 2) {
        currentYear = first.replace('年', '');
        continue;
      }

      let pokeName = (row[COL.pokemon] || '').trim();
      if (!pokeName || /宝可梦|寶可夢/.test(pokeName)) continue;

      // Strip gender
      pokeName = pokeName.replace(/\s*[♂♀]\s*\/?\s*[♂♀]?\s*$/g, '').trim();

      const baseName = getBaseSpecies(pokeName);
      const numInt = nameMap.get(baseName) || nameMap.get(pokeName) || null;
      if (!numInt) continue;

      const ot   = COL.ot !== undefined     ? (row[COL.ot] || '').trim()     : '';
      let level  = COL.level !== undefined  ? (row[COL.level] || '').trim()  : '';
      const date = COL.date !== undefined   ? (row[COL.date] || '').trim()   : '';
      const meth = COL.method !== undefined ? (row[COL.method] || '').trim() : '';
      const game = COL.games !== undefined  ? (row[COL.games] || '').trim()  : gameContext;

      level = level.replace(/^Lv\.?\s*/i, '').replace(/[^\d]/g, '');

      // Shorten long dates
      let dateStr = date;
      if (dateStr.length > 50) {
        const m = dateStr.match(/\d{4}年\d{1,2}月\d{1,2}日/);
        if (m) dateStr = m[0] + '~';
      }

      events.push({
        numInt,
        zh: pokeName,
        ot: ot || '—',
        level: level ? parseInt(level) : null,
        date: dateStr,
        method: classifyMethod(meth),
        games: game || gameContext,
        gen,
        year: currentYear,
      });
    }
  }

  return events;
}

/** Detect game title from a section heading */
function detectGame(heading) {
  if (!heading) return '';
  if (/劍|盾|Sword|Shield/.test(heading)) return '剑盾';
  if (/朱|紫|Scarlet|Violet/.test(heading)) return '朱紫';
  if (/HOME/.test(heading)) return 'HOME';
  if (/晶灿钻石|明亮珍珠|晶燦鑽石|明亮珍珠|Diamond|Pearl|BDSP/.test(heading)) return 'BDSP';
  if (/阿尔宙斯|阿爾宙斯|Arceus|Legends/.test(heading)) return 'PLA';
  if (/究极太阳|究极月亮|Ultra/.test(heading)) return 'USUM';
  if (/太阳|月亮|Sun|Moon/.test(heading)) return 'SM';
  if (/欧米伽|始源|Omega|Alpha|ORAS/.test(heading)) return 'ORAS';
  if (/[XY]/.test(heading)) return 'XY';
  if (/黑2|白2|Black 2|White 2/.test(heading)) return 'B2W2';
  if (/黑|白|Black|White/.test(heading)) return 'BW';
  if (/心金|魂银|HeartGold|SoulSilver/.test(heading)) return 'HGSS';
  if (/钻石|珍珠|白金|Diamond|Pearl|Platinum/.test(heading)) return 'DPPt';
  if (/火红|叶绿|FireRed|LeafGreen/.test(heading)) return 'FRLG';
  if (/红宝石|蓝宝石|翡翠|Ruby|Sapphire|Emerald/.test(heading)) return 'RSE';
  if (/金|银|水晶|Gold|Silver|Crystal/.test(heading)) return 'GSC';
  if (/红|绿|蓝|黄|Red|Green|Blue|Yellow/.test(heading)) return 'RBY';
  return '';
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('=== Fetching Event Distribution Data from 52poke ===\n');

  // --gen N
  const genIdx = process.argv.indexOf('--gen');
  const singleGen = genIdx !== -1 ? parseInt(process.argv[genIdx + 1]) : null;

  const nameMap = buildNameMap();
  console.log(`Name map: ${nameMap.size} entries\n`);

  const targets = singleGen
    ? GENERATIONS.filter(g => g.gen === singleGen)
    : GENERATIONS;

  const allEvents = [];

  for (const { gen, title } of targets) {
    console.log(`Gen ${gen}: ${title}`);
    try {
      const html = await fetchWikiPage(title);
      const events = parseGenPage(html, gen, nameMap);
      console.log(`  → ${events.length} events`);
      allEvents.push(...events);
      if (targets.length > 1) await sleep(DELAY_MS);
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
    }
  }

  console.log(`\nTotal raw events: ${allEvents.length}\n`);

  // Group by species
  const bySpecies = new Map();
  for (const ev of allEvents) {
    if (!bySpecies.has(ev.numInt)) {
      bySpecies.set(ev.numInt, {
        numInt: ev.numInt,
        zh: getBaseSpecies(ev.zh),
        events: [],
      });
    }
    bySpecies.get(ev.numInt).events.push({
      zh: ev.zh,
      ot: ev.ot,
      level: ev.level,
      date: ev.date,
      method: ev.method,
      games: ev.games,
      gen: ev.gen,
      year: ev.year,
    });
  }

  // Sort: newest first within each species
  for (const entry of bySpecies.values()) {
    entry.events.sort((a, b) => {
      if (a.gen !== b.gen) return b.gen - a.gen;
      return (b.year || '').localeCompare(a.year || '');
    });
  }

  const result = [...bySpecies.values()].sort((a, b) => a.numInt - b.numInt);

  // Stats
  const speciesCount = result.length;
  const totalEvents = result.reduce((s, e) => s + e.events.length, 0);
  console.log(`Species with events: ${speciesCount}`);
  console.log(`Total event entries:  ${totalEvents}`);

  const top = [...result].sort((a, b) => b.events.length - a.events.length).slice(0, 10);
  console.log('\nTop 10 most distributed:');
  for (const s of top) {
    console.log(`  ${s.zh} (#${s.numInt}): ${s.events.length}`);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n✓ ${OUTPUT}`);
  console.log(`  Size: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
