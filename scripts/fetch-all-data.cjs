/**
 * fetch-all-data.cjs
 * One-time script to build the complete local Pokémon database.
 * Run: node fetch-all-data.cjs
 * Output: data/pokemon.json, data/forms.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

if (!fs.existsSync('data')) fs.mkdirSync('data');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'LivingPokedex-DataFetch/1.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const HOME_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/';

// Generation ranges
const GEN_RANGES = {
  1:[1,151], 2:[152,251], 3:[252,386], 4:[387,493],
  5:[494,649], 6:[650,721], 7:[722,809], 8:[810,905], 9:[906,1025]
};

function getGen(id) {
  for (const [g, [s, e]] of Object.entries(GEN_RANGES)) {
    if (id >= s && id <= e) return parseInt(g);
  }
  return 9;
}

// ============================================================
// STEP 1: Fetch all 1025 Pokémon names (zh + en)
// ============================================================
async function fetchAllNames() {
  // Load existing if available
  if (fs.existsSync('../public/data/pokemon.json')) {
    const existing = JSON.parse(fs.readFileSync('../public/data/pokemon.json', 'utf8'));
    if (existing.length >= 1025) {
      console.log('pokemon.json already complete, skipping name fetch');
      return existing;
    }
  }

  // Load from names.json if available (previously fetched)
  let namesRaw = {};
  if (fs.existsSync('./data/names.json')) {
    namesRaw = JSON.parse(fs.readFileSync('./data/names.json', 'utf8'));
    console.log(`Loaded ${Object.keys(namesRaw).length} names from names.json`);
  }

  const pokemon = [];
  const BATCH = 20;

  for (let i = 1; i <= 1025; i += BATCH) {
    const batch = Array.from({ length: Math.min(BATCH, 1026 - i) }, (_, j) => i + j);
    await Promise.all(batch.map(async id => {
      let zh = namesRaw[id]?.zh;
      let en = namesRaw[id]?.en;

      // Fetch if missing
      if (!zh || !en) {
        const spec = await get(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
        if (spec) {
          zh = (spec.names.find(n => n.language.name === 'zh-Hans') ||
                spec.names.find(n => n.language.name === 'zh-Hant') ||
                spec.names.find(n => n.language.name === 'en') || {}).name || `#${id}`;
          en = (spec.names.find(n => n.language.name === 'en') || {}).name || `#${id}`;
        } else {
          zh = `#${id}`; en = `#${id}`;
        }
        await sleep(300);
      }

      pokemon.push({
        id,
        num: String(id).padStart(4, '0'),
        zh,
        en,
        gen: getGen(id),
        sprite: `${HOME_BASE}${id}.png`
      });
    }));

    pokemon.sort((a, b) => a.id - b.id);
    console.log(`Names: ${Math.min(i + BATCH - 1, 1025)}/1025`);
  }

  fs.writeFileSync('../public/data/pokemon.json', JSON.stringify(pokemon, null, 2));
  console.log('✅ data/pokemon.json written');
  return pokemon;
}

// ============================================================
// STEP 2: Build forms data with verified sprites
// ============================================================

// Complete forms definition with fetch strategy
const FORMS_DEF = [
  // --- GENDER DIFFERENCES ---
  // type:'gender' → fetch sprites.other.home.front_female from pokemon/{pokeId}
  { id:'pikachu-f',     num:25,  type:'gender', pokeId:25,  zh:'皮卡丘 ♀',      en:'Pikachu ♀' },
  { id:'unfezant-f',    num:521, type:'gender', pokeId:521, zh:'大尾火雉 ♀',    en:'Unfezant ♀' },
  { id:'frillish-f',    num:592, type:'gender', pokeId:592, zh:'轻飘飘 ♀',      en:'Frillish ♀' },
  { id:'jellicent-f',   num:593, type:'gender', pokeId:593, zh:'胶冻王 ♀',      en:'Jellicent ♀' },
  { id:'pyroar-f',      num:668, type:'gender', pokeId:668, zh:'火炎狮 ♀',      en:'Pyroar ♀' },
  { id:'combee-f',      num:415, type:'gender', pokeId:415, zh:'三蜂巢 ♀',      en:'Combee ♀' },
  { id:'hippopotas-f',  num:449, type:'gender', pokeId:449, zh:'河马兽 ♀',      en:'Hippopotas ♀' },
  { id:'hippowdon-f',   num:450, type:'gender', pokeId:450, zh:'河马王 ♀',      en:'Hippowdon ♀' },
  { id:'meowstic-f',    num:678, type:'gender', pokeId:678, zh:'超能妙喵 ♀',    en:'Meowstic ♀' },
  { id:'indeedee-f',    num:876, type:'gender', pokeId:876, zh:'多宝秘密 ♀',    en:'Indeedee ♀' },
  { id:'basculegion-f', num:902, type:'gender', pokeId:902, zh:'王者斑纹鱼 ♀',  en:'Basculegion ♀' },
  { id:'oinkologne-f',  num:916, type:'gender', pokeId:916, zh:'香香猪 ♀',      en:'Oinkologne ♀' },

  // --- UNOWN (28 forms) ---
  // type:'pokemon' → fetch from pokemon/{slug}
  ...['a','b','c','d','e','f','g','h','i','j','k','l','m',
      'n','o','p','q','r','s','t','u','v','w','x','y','z'].map(l => ({
    id: `unown-${l}`, num: 201, type: 'pokemon', slug: `unown-${l}`,
    zh: `未知图腾 ${l.toUpperCase()}`, en: `Unown ${l.toUpperCase()}`
  })),
  { id:'unown-em', num:201, type:'pokemon', slug:'unown-exclamation', zh:'未知图腾 !', en:'Unown !' },
  { id:'unown-qu', num:201, type:'pokemon', slug:'unown-question',    zh:'未知图腾 ?', en:'Unown ?' },

  // --- SHELLOS / GASTRODON ---
  { id:'shellos-west',   num:422, type:'pokemon', slug:'shellos-west-sea',   zh:'三地拿 西海',  en:'Shellos West Sea' },
  { id:'shellos-east',   num:422, type:'pokemon', slug:'shellos-east-sea',   zh:'三地拿 东海',  en:'Shellos East Sea' },
  { id:'gastrodon-west', num:423, type:'pokemon', slug:'gastrodon-west-sea', zh:'海兔兔 西海',  en:'Gastrodon West Sea' },
  { id:'gastrodon-east', num:423, type:'pokemon', slug:'gastrodon-east-sea', zh:'海兔兔 东海',  en:'Gastrodon East Sea' },

  // --- ROTOM forms ---
  { id:'rotom-heat',  num:479, type:'pokemon', slug:'rotom-heat',  zh:'洛托姆 热量', en:'Heat Rotom' },
  { id:'rotom-wash',  num:479, type:'pokemon', slug:'rotom-wash',  zh:'洛托姆 清洗', en:'Wash Rotom' },
  { id:'rotom-frost', num:479, type:'pokemon', slug:'rotom-frost', zh:'洛托姆 冷冻', en:'Frost Rotom' },
  { id:'rotom-fan',   num:479, type:'pokemon', slug:'rotom-fan',   zh:'洛托姆 旋转', en:'Fan Rotom' },
  { id:'rotom-mow',   num:479, type:'pokemon', slug:'rotom-mow',   zh:'洛托姆 割草', en:'Mow Rotom' },

  // --- BASCULIN ---
  { id:'basculin-red',  num:550, type:'pokemon', slug:'basculin-red-striped',  zh:'斑纹鱼 红条纹', en:'Basculin Red-Striped' },
  { id:'basculin-blue', num:550, type:'pokemon', slug:'basculin-blue-striped', zh:'斑纹鱼 蓝条纹', en:'Basculin Blue-Striped' },

  // --- DEERLING / SAWSBUCK ---
  ...['spring','summer','autumn','winter'].map((s,i) => ({
    id:`deerling-${s}`, num:585, type:'pokemon', slug:`deerling-${s}`,
    zh:`小鹿斑比 ${['春','夏','秋','冬'][i]}`, en:`Deerling ${s.charAt(0).toUpperCase()+s.slice(1)}`
  })),
  ...['spring','summer','autumn','winter'].map((s,i) => ({
    id:`sawsbuck-${s}`, num:586, type:'pokemon', slug:`sawsbuck-${s}`,
    zh:`惊角鹿 ${['春','夏','秋','冬'][i]}`, en:`Sawsbuck ${s.charAt(0).toUpperCase()+s.slice(1)}`
  })),

  // --- VIVILLON (18 patterns) — type:'pokemon-form' ---
  ...[
    ['icy-snow','雪地'],['polar','极地'],['tundra','冻土'],['continental','大陆'],
    ['garden','花园'],['elegant','高雅'],['meadow','草原'],['modern','现代'],
    ['marine','海洋'],['archipelago','群岛'],['high-plains','高原'],['sandstorm','沙暴'],
    ['river','河川'],['monsoon','季风'],['savanna','热带'],['sun','太阳'],
    ['ocean','蔚蓝'],['jungle','丛林']
  ].map(([s,zh]) => ({
    id:`vivillon-${s}`, num:666, type:'pokemon-form', slug:`vivillon-${s}`,
    zh:`彩粉蝶 ${zh}`, en:`Vivillon ${s.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`
  })),

  // --- FLABÉBÉ / FLOETTE / FLORGES (5 colors) --- type:'pokemon-form'
  ...['red','yellow','orange','blue','white'].map((c,i) => ({
    id:`flabebe-${c}`, num:669, type:'pokemon-form', slug:`flabebe-${c}`,
    zh:`花蓓蓓 ${['红','黄','橙','蓝','白'][i]}花`, en:`Flabébé ${c.charAt(0).toUpperCase()+c.slice(1)}`
  })),
  ...['red','yellow','orange','blue','white'].map((c,i) => ({
    id:`floette-${c}`, num:670, type:'pokemon-form', slug:`floette-${c}`,
    zh:`花叶蒂 ${['红','黄','橙','蓝','白'][i]}花`, en:`Floette ${c.charAt(0).toUpperCase()+c.slice(1)}`
  })),
  ...['red','yellow','orange','blue','white'].map((c,i) => ({
    id:`florges-${c}`, num:671, type:'pokemon-form', slug:`florges-${c}`,
    zh:`花洁夫人 ${['红','黄','橙','蓝','白'][i]}花`, en:`Florges ${c.charAt(0).toUpperCase()+c.slice(1)}`
  })),

  // --- FURFROU (10 trims) ---
  ...[['natural','自然'],['heart','心形'],['star','星形'],['diamond','钻石'],
      ['debutante','解构'],['matron','玛特洛'],['dandy','芬芳'],
      ['la-reine','拉鲁斯'],['pharaoh','法拉奥'],['kabuki','卡布']
  ].map(([s,zh]) => ({
    id:`furfrou-${s}`, num:676, type:'pokemon-form', slug:`furfrou-${s}`,
    zh:`多多美 ${zh}型`, en:`Furfrou ${s.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`
  })),

  // --- PUMPKABOO / GOURGEIST ---
  ...['small','average','large','super'].map((s,i) => ({
    id:`pumpkaboo-${s}`, num:710, type:'pokemon', slug:`pumpkaboo-${s}`,
    zh:`南瓜精 ${['小','中','大','超大'][i]}型`, en:`Pumpkaboo ${s.charAt(0).toUpperCase()+s.slice(1)}`
  })),
  ...['small','average','large','super'].map((s,i) => ({
    id:`gourgeist-${s}`, num:711, type:'pokemon', slug:`gourgeist-${s}`,
    zh:`南瓜怪人 ${['小','中','大','超大'][i]}型`, en:`Gourgeist ${s.charAt(0).toUpperCase()+s.slice(1)}`
  })),

  // --- ORICORIO ---
  { id:'oricorio-baile', num:741, type:'pokemon', slug:'oricorio-baile',   zh:'花舞鸟 红', en:"Oricorio Baile" },
  { id:'oricorio-pom',   num:741, type:'pokemon', slug:'oricorio-pom-pom', zh:'花舞鸟 黄', en:"Oricorio Pom-Pom" },
  { id:'oricorio-pau',   num:741, type:'pokemon', slug:'oricorio-pau',     zh:'花舞鸟 粉', en:"Oricorio Pa'u" },
  { id:'oricorio-sensu', num:741, type:'pokemon', slug:'oricorio-sensu',   zh:'花舞鸟 紫', en:"Oricorio Sensu" },

  // --- LYCANROC ---
  { id:'lycanroc-midday',   num:745, type:'pokemon', slug:'lycanroc-midday',   zh:'鬃岩狼人 昼',  en:'Lycanroc Midday' },
  { id:'lycanroc-midnight', num:745, type:'pokemon', slug:'lycanroc-midnight', zh:'鬃岩狼人 夜',  en:'Lycanroc Midnight' },
  { id:'lycanroc-dusk',     num:745, type:'pokemon', slug:'lycanroc-dusk',     zh:'鬃岩狼人 黄昏', en:'Lycanroc Dusk' },

  // --- WISHIWASHI ---
  { id:'wishiwashi-solo',   num:746, type:'pokemon', slug:'wishiwashi-solo',   zh:'弱丁鱼 单独', en:'Wishiwashi Solo' },
  { id:'wishiwashi-school', num:746, type:'pokemon', slug:'wishiwashi-school', zh:'弱丁鱼 群体', en:'Wishiwashi School' },

  // --- MINIOR (7 core colors) — use slug 'minior-{color}' for colored core sprite ---
  ...['red','orange','yellow','green','blue','indigo','violet'].map((c,i) => ({
    id:`minior-${c}`, num:774, type:'pokemon', slug:`minior-${c}`,
    zh:`小陨星 ${['红','橙','黄','绿','蓝','靛','紫'][i]}核`, en:`Minior ${c.charAt(0).toUpperCase()+c.slice(1)} Core`
  })),

  // --- MIMIKYU ---
  { id:'mimikyu-disguised', num:778, type:'pokemon', slug:'mimikyu-disguised', zh:'谜拟丘 伪装', en:'Mimikyu Disguised' },
  { id:'mimikyu-busted',    num:778, type:'pokemon', slug:'mimikyu-busted',    zh:'谜拟丘 现身', en:'Mimikyu Busted' },

  // --- TOXTRICITY ---
  { id:'toxtricity-amped',   num:849, type:'pokemon', slug:'toxtricity-amped',   zh:'颤弦蝾螈 强', en:'Toxtricity Amped' },
  { id:'toxtricity-low-key', num:849, type:'pokemon', slug:'toxtricity-low-key', zh:'颤弦蝾螈 弱', en:'Toxtricity Low Key' },

  // --- MAUSHOLD ---
  { id:'maushold-four',  num:925, type:'pokemon', slug:'maushold-family-of-four',  zh:'鼠鼠一家 四口', en:'Maushold Family of Four' },
  { id:'maushold-three', num:925, type:'pokemon', slug:'maushold-family-of-three', zh:'鼠鼠一家 三口', en:'Maushold Family of Three' },

  // --- SQUAWKABILLY ---
  { id:'squawk-green',  num:931, type:'pokemon', slug:'squawkabilly-green-plumage',  zh:'喳喳鸟 绿', en:'Squawkabilly Green' },
  { id:'squawk-blue',   num:931, type:'pokemon', slug:'squawkabilly-blue-plumage',   zh:'喳喳鸟 蓝', en:'Squawkabilly Blue' },
  { id:'squawk-yellow', num:931, type:'pokemon', slug:'squawkabilly-yellow-plumage', zh:'喳喳鸟 黄', en:'Squawkabilly Yellow' },
  { id:'squawk-white',  num:931, type:'pokemon', slug:'squawkabilly-white-plumage',  zh:'喳喳鸟 白', en:'Squawkabilly White' },

  // --- TATSUGIRI ---
  { id:'tatsugiri-curly',    num:977, type:'pokemon', slug:'tatsugiri-curly',    zh:'龙卷寿司 卷曲', en:'Tatsugiri Curly' },
  { id:'tatsugiri-droopy',   num:977, type:'pokemon', slug:'tatsugiri-droopy',   zh:'龙卷寿司 耷拉', en:'Tatsugiri Droopy' },
  { id:'tatsugiri-stretchy', num:977, type:'pokemon', slug:'tatsugiri-stretchy', zh:'龙卷寿司 伸展', en:'Tatsugiri Stretchy' },

  // --- DUDUNSPARCE ---
  { id:'dudunsparce-two',   num:982, type:'pokemon', slug:'dudunsparce-two-segment',   zh:'大长蛇 两段', en:'Dudunsparce Two-Segment' },
  { id:'dudunsparce-three', num:982, type:'pokemon', slug:'dudunsparce-three-segment', zh:'大长蛇 三段', en:'Dudunsparce Three-Segment' },

  // --- PALAFIN ---
  { id:'palafin-zero', num:964, type:'pokemon', slug:'palafin-zero', zh:'海豚侠 零',  en:'Palafin Zero' },
  { id:'palafin-hero', num:964, type:'pokemon', slug:'palafin-hero', zh:'海豚侠 英雄', en:'Palafin Hero' },

  // --- GIMMIGHOUL ---
  { id:'gimmighoul-chest',   num:999, type:'pokemon', slug:'gimmighoul',         zh:'宝箱小僵尸 箱子', en:'Gimmighoul Chest' },
  { id:'gimmighoul-roaming', num:999, type:'pokemon', slug:'gimmighoul-roaming', zh:'宝箱小僵尸 游荡', en:'Gimmighoul Roaming' },

  // --- POLTCHAGEIST / SINISTCHA ---
  // Counterfeit/Unremarkable: standard pokemon endpoint
  // Artisan/Masterpiece: no sprite in PokéAPI, use hardcoded HOME ID
  { id:'poltcha-counterfeit', num:1012, type:'pokemon', slug:'poltchageist',  zh:'抹茶幽灵 仿冒', en:'Poltchageist Counterfeit' },
  { id:'poltcha-artisan',     num:1012, type:'hardcoded', sprite:`${HOME_BASE}10261.png`, zh:'抹茶幽灵 正品', en:'Poltchageist Artisan' },
  { id:'sinistcha-unremark',  num:1013, type:'pokemon', slug:'sinistcha',    zh:'抹茶幽灵茶 普通', en:'Sinistcha Unremarkable' },
  { id:'sinistcha-master',    num:1013, type:'hardcoded', sprite:`${HOME_BASE}10262.png`, zh:'抹茶幽灵茶 杰作', en:'Sinistcha Masterpiece' },

  // === ALOLAN FORMS ===
  { id:'a-rattata',   num:19,  type:'pokemon', slug:'rattata-alola',   zh:'阿罗拉 小拉达',   en:'Alolan Rattata' },
  { id:'a-raticate',  num:20,  type:'pokemon', slug:'raticate-alola',  zh:'阿罗拉 拉达',     en:'Alolan Raticate' },
  { id:'a-raichu',    num:26,  type:'pokemon', slug:'raichu-alola',    zh:'阿罗拉 雷丘',     en:'Alolan Raichu' },
  { id:'a-sandshrew', num:27,  type:'pokemon', slug:'sandshrew-alola', zh:'阿罗拉 穿山鼠',   en:'Alolan Sandshrew' },
  { id:'a-sandslash', num:28,  type:'pokemon', slug:'sandslash-alola', zh:'阿罗拉 穿山王',   en:'Alolan Sandslash' },
  { id:'a-vulpix',    num:37,  type:'pokemon', slug:'vulpix-alola',    zh:'阿罗拉 六尾',     en:'Alolan Vulpix' },
  { id:'a-ninetales', num:38,  type:'pokemon', slug:'ninetales-alola', zh:'阿罗拉 九尾',     en:'Alolan Ninetales' },
  { id:'a-diglett',   num:50,  type:'pokemon', slug:'diglett-alola',   zh:'阿罗拉 地鼠',     en:'Alolan Diglett' },
  { id:'a-dugtrio',   num:51,  type:'pokemon', slug:'dugtrio-alola',   zh:'阿罗拉 三地鼠',   en:'Alolan Dugtrio' },
  { id:'a-meowth',    num:52,  type:'pokemon', slug:'meowth-alola',    zh:'阿罗拉 喵喵',     en:'Alolan Meowth' },
  { id:'a-persian',   num:53,  type:'pokemon', slug:'persian-alola',   zh:'阿罗拉 猫老大',   en:'Alolan Persian' },
  { id:'a-geodude',   num:74,  type:'pokemon', slug:'geodude-alola',   zh:'阿罗拉 小拳石',   en:'Alolan Geodude' },
  { id:'a-graveler',  num:75,  type:'pokemon', slug:'graveler-alola',  zh:'阿罗拉 隆隆石',   en:'Alolan Graveler' },
  { id:'a-golem',     num:76,  type:'pokemon', slug:'golem-alola',     zh:'阿罗拉 隆隆岩',   en:'Alolan Golem' },
  { id:'a-grimer',    num:88,  type:'pokemon', slug:'grimer-alola',    zh:'阿罗拉 臭泥',     en:'Alolan Grimer' },
  { id:'a-muk',       num:89,  type:'pokemon', slug:'muk-alola',       zh:'阿罗拉 臭臭泥',   en:'Alolan Muk' },
  { id:'a-exeggutor', num:103, type:'pokemon', slug:'exeggutor-alola', zh:'阿罗拉 椰蛋树',   en:'Alolan Exeggutor' },
  { id:'a-marowak',   num:105, type:'pokemon', slug:'marowak-alola',   zh:'阿罗拉 嗑头虫',   en:'Alolan Marowak' },

  // === GALARIAN FORMS ===
  { id:'g-meowth',     num:52,  type:'pokemon', slug:'meowth-galar',             zh:'伽勒尔 喵喵',     en:'Galarian Meowth' },
  { id:'g-ponyta',     num:77,  type:'pokemon', slug:'ponyta-galar',             zh:'伽勒尔 小火马',   en:'Galarian Ponyta' },
  { id:'g-rapidash',   num:78,  type:'pokemon', slug:'rapidash-galar',           zh:'伽勒尔 烈焰马',   en:'Galarian Rapidash' },
  { id:'g-slowpoke',   num:79,  type:'pokemon', slug:'slowpoke-galar',           zh:'伽勒尔 呆呆兽',   en:'Galarian Slowpoke' },
  { id:'g-slowbro',    num:80,  type:'pokemon', slug:'slowbro-galar',            zh:'伽勒尔 呆壳兽',   en:'Galarian Slowbro' },
  { id:'g-farfetchd',  num:83,  type:'pokemon', slug:'farfetchd-galar',          zh:'伽勒尔 大葱鸭',   en:"Galarian Farfetch'd" },
  { id:'g-weezing',    num:110, type:'pokemon', slug:'weezing-galar',            zh:'伽勒尔 双弹瓦斯', en:'Galarian Weezing' },
  { id:'g-mrmime',     num:122, type:'pokemon', slug:'mr-mime-galar',            zh:'伽勒尔 魔墙人偶', en:'Galarian Mr. Mime' },
  { id:'g-articuno',   num:144, type:'pokemon', slug:'articuno-galar',           zh:'伽勒尔 急冻鸟',   en:'Galarian Articuno' },
  { id:'g-zapdos',     num:145, type:'pokemon', slug:'zapdos-galar',             zh:'伽勒尔 闪电鸟',   en:'Galarian Zapdos' },
  { id:'g-moltres',    num:146, type:'pokemon', slug:'moltres-galar',            zh:'伽勒尔 火焰鸟',   en:'Galarian Moltres' },
  { id:'g-slowking',   num:199, type:'pokemon', slug:'slowking-galar',           zh:'伽勒尔 呆呆王',   en:'Galarian Slowking' },
  { id:'g-corsola',    num:222, type:'pokemon', slug:'corsola-galar',            zh:'伽勒尔 太阳珊瑚', en:'Galarian Corsola' },
  { id:'g-zigzagoon',  num:263, type:'pokemon', slug:'zigzagoon-galar',          zh:'伽勒尔 蚯蚓猫',   en:'Galarian Zigzagoon' },
  { id:'g-linoone',    num:264, type:'pokemon', slug:'linoone-galar',            zh:'伽勒尔 直冲猫',   en:'Galarian Linoone' },
  { id:'g-darumaka',   num:554, type:'pokemon', slug:'darumaka-galar',           zh:'伽勒尔 达摩狒狒', en:'Galarian Darumaka' },
  { id:'g-darmanitan', num:555, type:'pokemon', slug:'darmanitan-galar-standard',zh:'伽勒尔 火暴兽',   en:'Galarian Darmanitan' },
  { id:'g-yamask',     num:562, type:'pokemon', slug:'yamask-galar',             zh:'伽勒尔 哭哭面具', en:'Galarian Yamask' },
  { id:'g-stunfisk',   num:618, type:'pokemon', slug:'stunfisk-galar',           zh:'伽勒尔 雷电纹',   en:'Galarian Stunfisk' },

  // === HISUIAN FORMS ===
  { id:'h-growlithe',  num:58,  type:'pokemon', slug:'growlithe-hisui',   zh:'洗翠 卡蒂狗',   en:'Hisuian Growlithe' },
  { id:'h-arcanine',   num:59,  type:'pokemon', slug:'arcanine-hisui',    zh:'洗翠 风速狗',   en:'Hisuian Arcanine' },
  { id:'h-voltorb',    num:100, type:'pokemon', slug:'voltorb-hisui',     zh:'洗翠 霹雳电球', en:'Hisuian Voltorb' },
  { id:'h-electrode',  num:101, type:'pokemon', slug:'electrode-hisui',   zh:'洗翠 顽皮雷弹', en:'Hisuian Electrode' },
  { id:'h-typhlosion', num:157, type:'pokemon', slug:'typhlosion-hisui',  zh:'洗翠 火暴兽',   en:'Hisuian Typhlosion' },
  { id:'h-qwilfish',   num:211, type:'pokemon', slug:'qwilfish-hisui',    zh:'洗翠 刺刺鱼',   en:'Hisuian Qwilfish' },
  { id:'h-sneasel',    num:215, type:'pokemon', slug:'sneasel-hisui',     zh:'洗翠 狃拉',     en:'Hisuian Sneasel' },
  { id:'h-samurott',   num:503, type:'pokemon', slug:'samurott-hisui',    zh:'洗翠 大剑鬼',   en:'Hisuian Samurott' },
  { id:'h-lilligant',  num:549, type:'pokemon', slug:'lilligant-hisui',   zh:'洗翠 花舞姬',   en:'Hisuian Lilligant' },
  { id:'h-zorua',      num:570, type:'pokemon', slug:'zorua-hisui',       zh:'洗翠 索罗亚',   en:'Hisuian Zorua' },
  { id:'h-zoroark',    num:571, type:'pokemon', slug:'zoroark-hisui',     zh:'洗翠 索罗亚克', en:'Hisuian Zoroark' },
  { id:'h-braviary',   num:628, type:'pokemon', slug:'braviary-hisui',    zh:'洗翠 勇士雄鹰', en:'Hisuian Braviary' },
  { id:'h-sliggoo',    num:705, type:'pokemon', slug:'sliggoo-hisui',     zh:'洗翠 黏美儿',   en:'Hisuian Sliggoo' },
  { id:'h-goodra',     num:706, type:'pokemon', slug:'goodra-hisui',      zh:'洗翠 黏美龙',   en:'Hisuian Goodra' },
  { id:'h-avalugg',    num:713, type:'pokemon', slug:'avalugg-hisui',     zh:'洗翠 冰岩怪',   en:'Hisuian Avalugg' },
  { id:'h-decidueye',  num:724, type:'pokemon', slug:'decidueye-hisui',   zh:'洗翠 钻草帽鸮', en:'Hisuian Decidueye' },

  // === PALDEAN FORMS ===
  { id:'p-wooper',   num:194, type:'pokemon', slug:'wooper-paldea',              zh:'帕底亚 土蛙',          en:'Paldean Wooper' },
  { id:'p-tauros-c', num:128, type:'pokemon', slug:'tauros-paldea-combat-breed', zh:'帕底亚 肯泰罗 格斗种', en:'Paldean Tauros Combat' },
  { id:'p-tauros-b', num:128, type:'pokemon', slug:'tauros-paldea-blaze-breed',  zh:'帕底亚 肯泰罗 炎武种', en:'Paldean Tauros Blaze' },
  { id:'p-tauros-a', num:128, type:'pokemon', slug:'tauros-paldea-aqua-breed',   zh:'帕底亚 肯泰罗 水流种', en:'Paldean Tauros Aqua' },
];

async function fetchAllForms() {
  if (fs.existsSync('../public/data/forms.json')) {
    const existing = JSON.parse(fs.readFileSync('../public/data/forms.json', 'utf8'));
    const missing = FORMS_DEF.filter(f => !existing.find(e => e.id === f.id));
    if (missing.length === 0) {
      console.log('forms.json already complete, skipping');
      return existing;
    }
    console.log(`forms.json missing ${missing.length} entries, refetching...`);
  }

  // Load previously fetched form sprites
  let prevFormSprites = {};
  if (fs.existsSync('./data/form-sprites.json')) {
    prevFormSprites = JSON.parse(fs.readFileSync('./data/form-sprites.json', 'utf8'));
  }

  const forms = [];
  const BATCH = 8;

  for (let i = 0; i < FORMS_DEF.length; i += BATCH) {
    const batch = FORMS_DEF.slice(i, i + BATCH);
    await Promise.all(batch.map(async f => {
      let sprite = null;

      if (f.type === 'hardcoded') {
        sprite = f.sprite;

      } else if (f.type === 'gender') {
        const key = 'gender:' + f.pokeId;
        if (prevFormSprites[key]) {
          sprite = prevFormSprites[key];
        } else {
          const d = await get(`https://pokeapi.co/api/v2/pokemon/${f.pokeId}/`);
          sprite = d && (
            d.sprites?.other?.home?.front_female ||
            d.sprites?.front_female ||
            d.sprites?.other?.home?.front_default
          );
          await sleep(300);
        }

      } else if (f.type === 'pokemon-form') {
        const key = 'form:' + f.slug;
        if (prevFormSprites[key]) {
          sprite = prevFormSprites[key];
        } else {
          const d = await get(`https://pokeapi.co/api/v2/pokemon-form/${f.slug}/`);
          sprite = d && d.sprites?.front_default;
          await sleep(300);
        }

      } else { // type:'pokemon'
        const d = await get(`https://pokeapi.co/api/v2/pokemon/${f.slug}/`);
        sprite = d && (
          d.sprites?.other?.home?.front_default ||
          d.sprites?.other?.['official-artwork']?.front_default ||
          d.sprites?.front_default
        );
        await sleep(300);
      }

      forms.push({
        id: f.id,
        num: String(f.num).padStart(4, '0'),
        numInt: f.num,
        zh: f.zh,
        en: f.en,
        sprite: sprite || `${HOME_BASE}${f.num}.png`,
        section: 'forms'
      });

      process.stdout.write(`  ${f.id}: ${sprite ? '✓' : '⚠ fallback'}\n`);
    }));
  }

  // Sort by numInt
  forms.sort((a, b) => a.numInt - b.numInt);

  fs.writeFileSync('../public/data/forms.json', JSON.stringify(forms, null, 2));
  console.log(`✅ data/forms.json written (${forms.length} entries)`);
  return forms;
}

// ============================================================
// Write README
// ============================================================
function writeReadme() {
  const readme = `# Pokémon Data

Pre-fetched from PokéAPI (https://pokeapi.co). Do not hand-edit.

## Files

- **pokemon.json** — All 1025 standard Pokémon (id, num, zh, en, gen, sprite)
- **forms.json** — All HOME-valid form/gender variants (id, num, zh, en, sprite, section)

## Sprite source

Main sprites: \`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/{id}.png\`
Form sprites: fetched from PokéAPI /pokemon/ and /pokemon-form/ endpoints, then resolved to GitHub raw URLs.

## Update

To refresh for a new generation: \`node fetch-all-data.cjs\`

Last updated: ${new Date().toISOString()}
`;
  fs.writeFileSync('../public/data/README.md', readme);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('=== Pokémon Data Fetcher ===\n');

  console.log('Step 1: Fetching all Pokémon names...');
  await fetchAllNames();

  console.log('\nStep 2: Fetching all form sprites...');
  await fetchAllForms();

  writeReadme();

  console.log('\n✅ All done! data/ is ready.');
}

main().catch(console.error);
