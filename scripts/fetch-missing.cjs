const https = require('https');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'LivingPokedex/1.0' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { rej(new Error('JSON parse fail: ' + d.slice(0,100))); } });
    }).on('error', rej);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getSprite(slug) {
  try {
    const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${slug}`);
    const home = data?.sprites?.other?.home?.front_default;
    const artwork = data?.sprites?.other?.['official-artwork']?.front_default;
    const basic = data?.sprites?.front_default;
    return { id: data.id, sprite: home || artwork || basic, hasHome: !!home };
  } catch(e) {
    return { id: null, sprite: null, hasHome: false, error: e.message };
  }
}

const TYPES = ['fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark','fairy'];
const TYPE_ZH = {
  fighting:'格斗', flying:'飞翔', poison:'毒', ground:'大地', rock:'岩石',
  bug:'虫', ghost:'幽灵', steel:'钢', fire:'火', water:'水', grass:'草',
  electric:'电', psychic:'超能力', ice:'冰', dragon:'龙', dark:'恶', fairy:'妖精'
};

// All entries to fetch: [slug, num, zh, en, section, subsection]
const ENTRIES = [
  // --- Deoxys 4 forms (add to form section, base is already in main #386) ---
  { slug:'deoxys-attack',   num:'386', zh:'代欧奇希斯 攻击形态', en:'Deoxys Attack Forme',   section:'form' },
  { slug:'deoxys-defense',  num:'386', zh:'代欧奇希斯 防御形态', en:'Deoxys Defense Forme',  section:'form' },
  { slug:'deoxys-speed',    num:'386', zh:'代欧奇希斯 速度形态', en:'Deoxys Speed Forme',    section:'form' },

  // --- Burmy 3 forms (base plant form is #412 in main) ---
  { slug:'burmy-sandy',    num:'412', zh:'蓑衣虫 砂地蓑衣', en:'Burmy Sandy Cloak',  section:'form' },
  { slug:'burmy-trash',    num:'412', zh:'蓑衣虫 垃圾蓑衣', en:'Burmy Trash Cloak',  section:'form' },

  // --- Wormadam 3 forms (plant is #413 in main) ---
  { slug:'wormadam-sandy', num:'413', zh:'结草贵妇 砂地蓑衣', en:'Wormadam Sandy Cloak', section:'form' },
  { slug:'wormadam-trash', num:'413', zh:'结草贵妇 垃圾蓑衣', en:'Wormadam Trash Cloak',  section:'form' },

  // --- Castform (HOME only stores normal form - battle forms are NOT stored) ---
  // Skip: sunny/rainy/snowy are battle-only

  // --- Genesect 4 drive forms (base #649 in main) ---
  { slug:'genesect-shock', num:'649', zh:'盖诺赛克特 电击驱动', en:'Genesect (Shock Drive)',  section:'form' },
  { slug:'genesect-burn',  num:'649', zh:'盖诺赛克特 火焰驱动', en:'Genesect (Burn Drive)',   section:'form' },
  { slug:'genesect-chill', num:'649', zh:'盖诺赛克特 冰冻驱动', en:'Genesect (Chill Drive)',  section:'form' },
  { slug:'genesect-douse', num:'649', zh:'盖诺赛克特 水流驱动', en:'Genesect (Douse Drive)',  section:'form' },

  // --- Zygarde forms (10% and 50% Power Construct; Complete is NOT storable in HOME) ---
  { slug:'zygarde-10',     num:'718', zh:'基格尔德 10%形态', en:'Zygarde 10% Forme',       section:'form' },
  { slug:'zygarde-50',     num:'718', zh:'基格尔德 50% 力量结构', en:'Zygarde 50% (Power Construct)', section:'form' },

  // --- Ogerpon masks (teal/base is #1017 in main) ---
  { slug:'ogerpon-wellspring-mask',   num:'1017', zh:'犬木椿 井水面具',  en:'Ogerpon Wellspring Mask',   section:'form' },
  { slug:'ogerpon-hearthflame-mask',  num:'1017', zh:'犬木椿 熔岩面具',  en:'Ogerpon Hearthflame Mask',  section:'form' },
  { slug:'ogerpon-cornerstone-mask',  num:'1017', zh:'犬木椿 磐石面具',  en:'Ogerpon Cornerstone Mask',  section:'form' },

  // --- Terapagos forms (normal is #1024 in main) ---
  { slug:'terapagos-terastal', num:'1024', zh:'特拉帕戈斯 星晶形态', en:'Terapagos Terastal Form', section:'form' },
  { slug:'terapagos-stellar',  num:'1024', zh:'特拉帕戈斯 王者形态', en:'Terapagos Stellar Form',  section:'form' },

  // --- Arceus 17 type forms (normal #493 in main) ---
  ...TYPES.map(t => ({
    slug: `arceus-${t}`, num: '493',
    zh: `阿尔宙斯 ${TYPE_ZH[t]}属性`, en: `Arceus (${t.charAt(0).toUpperCase()+t.slice(1)})`,
    section: 'form'
  })),

  // --- Silvally 17 type forms (normal #773 in main) ---
  ...TYPES.map(t => ({
    slug: `silvally-${t}`, num: '773',
    zh: `银伴战兽 ${TYPE_ZH[t]}记忆`, en: `Silvally (${t.charAt(0).toUpperCase()+t.slice(1)})`,
    section: 'form'
  })),

  // --- Alcremie 63 forms ---
  // 9 cream types × 7 sweets
  ...(() => {
    const creams = [
      ['vanilla-cream',   '香草奶油'],
      ['ruby-cream',      '红玉奶油'],
      ['matcha-cream',    '抹茶奶油'],
      ['mint-cream',      '薄荷奶油'],
      ['lemon-cream',     '柠檬奶油'],
      ['salted-cream',    '盐味奶油'],
      ['caramel-swirl',   '焦糖漩涡'],
      ['ruby-swirl',      '红玉漩涡'],
      ['rainbow-swirl',   '彩虹漩涡'],
    ];
    const sweets = [
      ['strawberry-sweet','草莓糖'],
      ['berry-sweet',     '果实糖'],
      ['love-sweet',      '爱心糖'],
      ['star-sweet',      '星星糖'],
      ['clover-sweet',    '三叶草糖'],
      ['flower-sweet',    '花朵糖'],
      ['ribbon-sweet',    '缎带糖'],
    ];
    const entries = [];
    for (const [cream, creamZH] of creams) {
      for (const [sweet, sweetZH] of sweets) {
        const isBase = cream === 'vanilla-cream' && sweet === 'strawberry-sweet';
        if (isBase) continue; // base form already in main #869
        const slug = `alcremie-${cream}-${sweet}`;
        entries.push({
          slug,
          num: '869',
          zh: `奶油精 ${creamZH}·${sweetZH}`,
          en: `Alcremie (${cream.replace(/-/g,' ')} ${sweet.replace(/-/g,' ')})`,
          section: 'form'
        });
      }
    }
    return entries;
  })(),

  // --- Gigantamax forms (new 'gmax' section) ---
  { slug:'venusaur-gmax',               num:'3',   zh:'妙蛙花 超极巨化',     en:'Gigantamax Venusaur',           section:'gmax' },
  { slug:'charizard-gmax',              num:'6',   zh:'喷火龙 超极巨化',     en:'Gigantamax Charizard',          section:'gmax' },
  { slug:'blastoise-gmax',              num:'9',   zh:'水箭龟 超极巨化',     en:'Gigantamax Blastoise',          section:'gmax' },
  { slug:'butterfree-gmax',             num:'12',  zh:'巴大蝶 超极巨化',     en:'Gigantamax Butterfree',         section:'gmax' },
  { slug:'pikachu-gmax',                num:'25',  zh:'皮卡丘 超极巨化',     en:'Gigantamax Pikachu',            section:'gmax' },
  { slug:'meowth-gmax',                 num:'52',  zh:'喵喵 超极巨化',       en:'Gigantamax Meowth',             section:'gmax' },
  { slug:'machamp-gmax',                num:'68',  zh:'怪力 超极巨化',       en:'Gigantamax Machamp',            section:'gmax' },
  { slug:'gengar-gmax',                 num:'94',  zh:'耿鬼 超极巨化',       en:'Gigantamax Gengar',             section:'gmax' },
  { slug:'kingler-gmax',                num:'99',  zh:'巨钳蟹 超极巨化',     en:'Gigantamax Kingler',            section:'gmax' },
  { slug:'lapras-gmax',                 num:'131', zh:'拉普拉斯 超极巨化',   en:'Gigantamax Lapras',             section:'gmax' },
  { slug:'eevee-gmax',                  num:'133', zh:'伊布 超极巨化',       en:'Gigantamax Eevee',              section:'gmax' },
  { slug:'snorlax-gmax',                num:'143', zh:'卡比兽 超极巨化',     en:'Gigantamax Snorlax',            section:'gmax' },
  { slug:'garbodor-gmax',               num:'569', zh:'垃圾堆 超极巨化',     en:'Gigantamax Garbodor',           section:'gmax' },
  { slug:'melmetal-gmax',               num:'809', zh:'美录梅塔 超极巨化',   en:'Gigantamax Melmetal',           section:'gmax' },
  { slug:'corviknight-gmax',            num:'823', zh:'钢铠鸦 超极巨化',     en:'Gigantamax Corviknight',        section:'gmax' },
  { slug:'orbeetle-gmax',               num:'826', zh:'圆滚滚 超极巨化',     en:'Gigantamax Orbeetle',           section:'gmax' },
  { slug:'drednaw-gmax',                num:'834', zh:'剪缺缺 超极巨化',     en:'Gigantamax Drednaw',            section:'gmax' },
  { slug:'coalossal-gmax',              num:'839', zh:'巨炭山 超极巨化',     en:'Gigantamax Coalossal',          section:'gmax' },
  { slug:'flapple-gmax',                num:'841', zh:'啪嚓苹果 超极巨化',   en:'Gigantamax Flapple',            section:'gmax' },
  { slug:'appletun-gmax',               num:'842', zh:'甜蜜苹果 超极巨化',   en:'Gigantamax Appletun',           section:'gmax' },
  { slug:'sandaconda-gmax',             num:'844', zh:'沙螺蟒 超极巨化',     en:'Gigantamax Sandaconda',         section:'gmax' },
  { slug:'toxtricity-amped-gmax',       num:'849', zh:'颤弦蝾螈 超极巨化(强)', en:'Gigantamax Toxtricity (Amped)', section:'gmax' },
  { slug:'toxtricity-low-key-gmax',     num:'849', zh:'颤弦蝾螈 超极巨化(弱)', en:'Gigantamax Toxtricity (Low Key)', section:'gmax' },
  { slug:'centiskorch-gmax',            num:'851', zh:'蜈蚣王 超极巨化',     en:'Gigantamax Centiskorch',        section:'gmax' },
  { slug:'hatterene-gmax',              num:'858', zh:'魔法少女帽 超极巨化', en:'Gigantamax Hatterene',          section:'gmax' },
  { slug:'grimmsnarl-gmax',             num:'861', zh:'长毛巨魔 超极巨化',   en:'Gigantamax Grimmsnarl',         section:'gmax' },
  { slug:'alcremie-gmax',               num:'869', zh:'奶油精 超极巨化',     en:'Gigantamax Alcremie',           section:'gmax' },
  { slug:'copperajah-gmax',             num:'879', zh:'象牙铜象 超极巨化',   en:'Gigantamax Copperajah',         section:'gmax' },
  { slug:'duraludon-gmax',              num:'884', zh:'钢铠龙 超极巨化',     en:'Gigantamax Duraludon',          section:'gmax' },
  { slug:'urshifu-single-strike-gmax',  num:'892', zh:'武道熊师 超极巨化(一击)', en:'Gigantamax Urshifu Single Strike', section:'gmax' },
  { slug:'urshifu-rapid-strike-gmax',   num:'892', zh:'武道熊师 超极巨化(连击)', en:'Gigantamax Urshifu Rapid Strike',  section:'gmax' },
];

async function main() {
  const results = [];
  let ok = 0, miss = 0;

  for (const e of ENTRIES) {
    const info = await getSprite(e.slug);
    const entry = {
      id: e.slug,
      num: String(e.num).padStart(4, '0'),
      numInt: parseInt(e.num),
      zh: e.zh,
      en: e.en,
      sprite: info.sprite,
      section: e.section
    };
    results.push(entry);
    const status = info.sprite ? (info.hasHome ? 'HOME' : 'fallback') : 'MISS';
    if (info.sprite) ok++; else miss++;
    process.stdout.write(`[${status}] ${e.slug}\n`);
    await sleep(200);
  }

  fs.writeFileSync('./data/new-forms.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nDone: ${ok} OK, ${miss} MISS → new-forms.json`);
}

main().catch(console.error);
