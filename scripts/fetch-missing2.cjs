/**
 * Build complete new-forms.json using pokemon-form endpoint for sprites
 * where PokéAPI /pokemon/ slug doesn't work.
 */
const https = require('https');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'LivingPokedex/1.0' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { rej(new Error('JSON: ' + d.slice(0,80))); } });
    }).on('error', rej);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const HOME = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/';
const SPRITE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

const TYPES = ['fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark','fairy'];
const TYPE_ZH = { fighting:'格斗', flying:'飞翔', poison:'毒', ground:'大地', rock:'岩石', bug:'虫', ghost:'幽灵', steel:'钢', fire:'火', water:'水', grass:'草', electric:'电', psychic:'超能力', ice:'冰', dragon:'龙', dark:'恶', fairy:'妖精' };

// Alcremie: 9 creams × 7 sweets = 63 forms
// HOME IDs 10196-10258 (63 forms), base (#869) is 10196 vanilla+strawberry
// Order: strawberry/berry/love/star/clover/flower/ribbon for each cream in order
const CREAMS = [
  ['vanilla-cream','香草奶油'],['ruby-cream','红玉奶油'],['matcha-cream','抹茶奶油'],
  ['mint-cream','薄荷奶油'],['lemon-cream','柠檬奶油'],['salted-cream','盐味奶油'],
  ['caramel-swirl','焦糖漩涡'],['ruby-swirl','红玉漩涡'],['rainbow-swirl','彩虹漩涡'],
];
const SWEETS = [
  ['strawberry-sweet','草莓糖'],['berry-sweet','果实糖'],['love-sweet','爱心糖'],
  ['star-sweet','星星糖'],['clover-sweet','三叶草糖'],['flower-sweet','花朵糖'],['ribbon-sweet','缎带糖'],
];

// Build sprite map for Alcremie (HOME IDs 10196-10258)
function alcremieSprite(creamIdx, sweetIdx) {
  const idx = creamIdx * 7 + sweetIdx; // 0-62
  return HOME + (10196 + idx) + '.png';
}

// Genesect drive HOME IDs: shock=10033, burn=10034, chill=10035, douse=10036
const GENESECT_DRIVES = [
  { slug:'genesect-shock', drive:'shock', id:10033, zh:'盖诺赛克特 电击驱动', en:'Genesect (Shock Drive)' },
  { slug:'genesect-burn',  drive:'burn',  id:10034, zh:'盖诺赛克特 火焰驱动', en:'Genesect (Burn Drive)' },
  { slug:'genesect-chill', drive:'chill', id:10035, zh:'盖诺赛克特 冰冻驱动', en:'Genesect (Chill Drive)' },
  { slug:'genesect-douse', drive:'douse', id:10036, zh:'盖诺赛克特 水流驱动', en:'Genesect (Douse Drive)' },
];

// Arceus type form sprite pattern: SPRITE + '493-{type}.png'
// Silvally type form sprite pattern: SPRITE + '773-{type}.png'
// Burmy: SPRITE + '412-sandy.png', '412-trash.png'

async function getFormSprite(formSlug) {
  try {
    const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon-form/${formSlug}`);
    return data?.sprites?.front_default || null;
  } catch(e) { return null; }
}

async function getPokemonSprite(slug) {
  try {
    const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${slug}`);
    return data?.sprites?.other?.home?.front_default ||
           data?.sprites?.other?.['official-artwork']?.front_default ||
           data?.sprites?.front_default || null;
  } catch(e) { return null; }
}

async function main() {
  const results = [];

  function add(entry) { results.push(entry); }
  function makeEntry(id, num, zh, en, sprite, section) {
    return { id, num: String(num).padStart(4,'0'), numInt: parseInt(num), zh, en, sprite, section };
  }

  console.log('=== Deoxys forms ===');
  for (const [slug, zh, en] of [
    ['deoxys-attack','代欧奇希斯 攻击形态','Deoxys Attack Forme'],
    ['deoxys-defense','代欧奇希斯 防御形态','Deoxys Defense Forme'],
    ['deoxys-speed','代欧奇希斯 速度形态','Deoxys Speed Forme'],
  ]) {
    const s = await getPokemonSprite(slug);
    console.log(slug, s ? 'OK' : 'MISS');
    add(makeEntry(slug, 386, zh, en, s, 'form'));
    await sleep(200);
  }

  console.log('=== Burmy / Wormadam ===');
  for (const [slug, num, zh, en] of [
    ['burmy-sandy',    412, '蓑衣虫 砂地蓑衣',  'Burmy Sandy Cloak'],
    ['burmy-trash',    412, '蓑衣虫 垃圾蓑衣',  'Burmy Trash Cloak'],
    ['wormadam-sandy', 413, '结草贵妇 砂地蓑衣', 'Wormadam Sandy Cloak'],
    ['wormadam-trash', 413, '结草贵妇 垃圾蓑衣', 'Wormadam Trash Cloak'],
  ]) {
    let s = await getPokemonSprite(slug);
    if (!s) s = await getFormSprite(slug);
    if (!s) {
      // Fallback: direct sprite URL pattern
      const suffix = slug.includes('burmy') ? slug.replace('burmy-','') : slug.replace('wormadam-','');
      const base = slug.includes('burmy') ? 412 : 413;
      s = SPRITE + base + '-' + suffix + '.png';
    }
    console.log(slug, s ? 'OK' : 'MISS');
    add(makeEntry(slug, num, zh, en, s, 'form'));
    await sleep(200);
  }

  console.log('=== Genesect drives ===');
  for (const g of GENESECT_DRIVES) {
    const s = HOME + g.id + '.png';
    console.log(g.slug, 'HOME id=' + g.id);
    add(makeEntry(g.slug, 649, g.zh, g.en, s, 'form'));
  }

  console.log('=== Zygarde forms ===');
  for (const [slug, zh, en] of [
    ['zygarde-10',  '基格尔德 10%形态',        'Zygarde 10% Forme'],
    ['zygarde-50',  '基格尔德 50% 力量结构体', 'Zygarde 50% Power Construct'],
  ]) {
    const s = await getPokemonSprite(slug);
    console.log(slug, s ? 'OK' : 'MISS');
    add(makeEntry(slug, 718, zh, en, s, 'form'));
    await sleep(200);
  }

  console.log('=== Ogerpon masks ===');
  for (const [slug, zh, en] of [
    ['ogerpon-wellspring-mask',  '犬木椿 井水面具',  'Ogerpon Wellspring Mask'],
    ['ogerpon-hearthflame-mask', '犬木椿 熔岩面具',  'Ogerpon Hearthflame Mask'],
    ['ogerpon-cornerstone-mask', '犬木椿 磐石面具',  'Ogerpon Cornerstone Mask'],
  ]) {
    const s = await getPokemonSprite(slug);
    console.log(slug, s ? 'OK' : 'MISS');
    add(makeEntry(slug, 1017, zh, en, s, 'form'));
    await sleep(200);
  }

  console.log('=== Terapagos forms ===');
  for (const [slug, zh, en] of [
    ['terapagos-terastal', '特拉帕戈斯 星晶形态', 'Terapagos Terastal Form'],
    ['terapagos-stellar',  '特拉帕戈斯 王者形态', 'Terapagos Stellar Form'],
  ]) {
    const s = await getPokemonSprite(slug);
    console.log(slug, s ? 'OK' : 'MISS');
    add(makeEntry(slug, 1024, zh, en, s, 'form'));
    await sleep(200);
  }

  console.log('=== Arceus 17 type forms ===');
  for (const t of TYPES) {
    const sprite = SPRITE + '493-' + t + '.png';
    add(makeEntry('arceus-' + t, 493, `阿尔宙斯 ${TYPE_ZH[t]}属性`, `Arceus (${t[0].toUpperCase()+t.slice(1)})`, sprite, 'form'));
  }
  console.log('Arceus done (static sprites)');

  console.log('=== Silvally 17 type forms ===');
  for (const t of TYPES) {
    const sprite = SPRITE + '773-' + t + '.png';
    add(makeEntry('silvally-' + t, 773, `银伴战兽 ${TYPE_ZH[t]}记忆`, `Silvally (${t[0].toUpperCase()+t.slice(1)})`, sprite, 'form'));
  }
  console.log('Silvally done (static sprites)');

  console.log('=== Alcremie 62 additional forms (base is main #869) ===');
  for (let ci = 0; ci < CREAMS.length; ci++) {
    const [cream, creamZH] = CREAMS[ci];
    for (let si = 0; si < SWEETS.length; si++) {
      const [sweet, sweetZH] = SWEETS[si];
      if (ci === 0 && si === 0) continue; // vanilla+strawberry = base, skip
      const id = 'alcremie-' + cream + '-' + sweet;
      const sprite = alcremieSprite(ci, si);
      add(makeEntry(id, 869, `奶油精 ${creamZH}·${sweetZH}`, `Alcremie (${cream} ${sweet})`, sprite, 'form'));
    }
  }
  console.log('Alcremie done (static HOME IDs)');

  console.log('=== Gigantamax forms ===');
  const GMAX = [
    ['venusaur-gmax',              3,   '妙蛙花 超极巨化',        'Gigantamax Venusaur'],
    ['charizard-gmax',             6,   '喷火龙 超极巨化',        'Gigantamax Charizard'],
    ['blastoise-gmax',             9,   '水箭龟 超极巨化',        'Gigantamax Blastoise'],
    ['butterfree-gmax',            12,  '巴大蝶 超极巨化',        'Gigantamax Butterfree'],
    ['pikachu-gmax',               25,  '皮卡丘 超极巨化',        'Gigantamax Pikachu'],
    ['meowth-gmax',                52,  '喵喵 超极巨化',          'Gigantamax Meowth'],
    ['machamp-gmax',               68,  '怪力 超极巨化',          'Gigantamax Machamp'],
    ['gengar-gmax',                94,  '耿鬼 超极巨化',          'Gigantamax Gengar'],
    ['kingler-gmax',               99,  '巨钳蟹 超极巨化',        'Gigantamax Kingler'],
    ['lapras-gmax',                131, '拉普拉斯 超极巨化',      'Gigantamax Lapras'],
    ['eevee-gmax',                 133, '伊布 超极巨化',          'Gigantamax Eevee'],
    ['snorlax-gmax',               143, '卡比兽 超极巨化',        'Gigantamax Snorlax'],
    ['garbodor-gmax',              569, '垃圾堆 超极巨化',        'Gigantamax Garbodor'],
    ['melmetal-gmax',              809, '美录梅塔 超极巨化',      'Gigantamax Melmetal'],
    ['corviknight-gmax',           823, '钢铠鸦 超极巨化',        'Gigantamax Corviknight'],
    ['orbeetle-gmax',              826, '圆滚滚 超极巨化',        'Gigantamax Orbeetle'],
    ['drednaw-gmax',               834, '剪缺缺 超极巨化',        'Gigantamax Drednaw'],
    ['coalossal-gmax',             839, '巨炭山 超极巨化',        'Gigantamax Coalossal'],
    ['flapple-gmax',               841, '啪嚓苹果 超极巨化',     'Gigantamax Flapple'],
    ['appletun-gmax',              842, '甜蜜苹果 超极巨化',      'Gigantamax Appletun'],
    ['sandaconda-gmax',            844, '沙螺蟒 超极巨化',        'Gigantamax Sandaconda'],
    ['toxtricity-amped-gmax',      849, '颤弦蝾螈 超极巨化·强',  'Gigantamax Toxtricity (Amped)'],
    ['toxtricity-low-key-gmax',    849, '颤弦蝾螈 超极巨化·弱',  'Gigantamax Toxtricity (Low Key)'],
    ['centiskorch-gmax',           851, '蜈蚣王 超极巨化',        'Gigantamax Centiskorch'],
    ['hatterene-gmax',             858, '魔法少女帽 超极巨化',    'Gigantamax Hatterene'],
    ['grimmsnarl-gmax',            861, '长毛巨魔 超极巨化',      'Gigantamax Grimmsnarl'],
    ['alcremie-gmax',              869, '奶油精 超极巨化',        'Gigantamax Alcremie'],
    ['copperajah-gmax',            879, '象牙铜象 超极巨化',      'Gigantamax Copperajah'],
    ['duraludon-gmax',             884, '钢铠龙 超极巨化',        'Gigantamax Duraludon'],
    ['urshifu-single-strike-gmax', 892, '武道熊师 超极巨化·一击', 'Gigantamax Urshifu Single Strike'],
    ['urshifu-rapid-strike-gmax',  892, '武道熊师 超极巨化·连击', 'Gigantamax Urshifu Rapid Strike'],
  ];
  for (const [slug, num, zh, en] of GMAX) {
    const s = await getPokemonSprite(slug);
    console.log(slug, s ? 'HOME' : 'MISS');
    add(makeEntry(slug, num, zh, en, s, 'gmax'));
    await sleep(150);
  }

  fs.writeFileSync('./data/new-forms.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('\nTotal new entries:', results.length);
  const bySection = {};
  results.forEach(r => { bySection[r.section] = (bySection[r.section]||0)+1; });
  console.log('By section:', bySection);
  const noSprite = results.filter(r => !r.sprite).map(r => r.id);
  if (noSprite.length) console.log('No sprite:', noSprite.join(', '));
}

main().catch(console.error);
