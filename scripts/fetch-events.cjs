const https = require('https');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'LivingPokedex/1.0' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { rej(e); } });
    }).on('error', rej);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const ENTRIES = [
  // Pikachu caps (小智帽子皮卡丘)
  { slug: 'pikachu-original-cap', num: '25', zh: '皮卡丘 XY小智帽', en: "Pikachu Ash's XY Cap" },
  { slug: 'pikachu-hoenn-cap',    num: '25', zh: '皮卡丘 ORAS小智帽', en: "Pikachu Ash's ORAS Cap" },
  { slug: 'pikachu-sinnoh-cap',   num: '25', zh: '皮卡丘 DP小智帽', en: "Pikachu Ash's DP Cap" },
  { slug: 'pikachu-unova-cap',    num: '25', zh: '皮卡丘 BW小智帽', en: "Pikachu Ash's BW Cap" },
  { slug: 'pikachu-kalos-cap',    num: '25', zh: '皮卡丘 XY小智帽2', en: "Pikachu Ash's Kalos Cap" },
  { slug: 'pikachu-alola-cap',    num: '25', zh: '皮卡丘 SM小智帽', en: "Pikachu Ash's Alola Cap" },
  { slug: 'pikachu-partner-cap',  num: '25', zh: '皮卡丘 搭档帽', en: "Pikachu Partner Cap" },
  { slug: 'pikachu-world-cap',    num: '25', zh: '皮卡丘 世界帽', en: "Pikachu World Cap" },
  // Event / special forms
  { slug: 'magearna-original',    num: '801', zh: '马盖娜 原色', en: 'Magearna Original Color' },
  { slug: 'zarude-dada',          num: '893', zh: '扎鲁德 爸爸', en: 'Zarude Dada' },
  { slug: 'calyrex-ice',          num: '898', zh: '蕾冠王 白马骑士', en: 'Calyrex Ice Rider' },
  { slug: 'calyrex-shadow',       num: '898', zh: '蕾冠王 黑马骑士', en: 'Calyrex Shadow Rider' },
  { slug: 'hoopa-unbound',        num: '720', zh: '胡帕 魔圈解放', en: 'Hoopa Unbound' },
  { slug: 'shaymin-sky',          num: '492', zh: '谢米 天空形', en: 'Shaymin Sky Forme' },
  { slug: 'keldeo-resolute',      num: '647', zh: '克雷色利亚 觉悟形', en: 'Keldeo Resolute Forme' },
  { slug: 'meloetta-pirouette',   num: '648', zh: '梅洛耶塔 歌舞形', en: 'Meloetta Pirouette Forme' },
  { slug: 'necrozma-dawn',        num: '800', zh: '奈克洛兹玛 日食', en: 'Necrozma Dawn Wings' },
  { slug: 'necrozma-dusk',        num: '800', zh: '奈克洛兹玛 月食', en: 'Necrozma Dusk Mane' },
  { slug: 'zygarde-complete',     num: '718', zh: '基格尔德 完全形', en: 'Zygarde Complete Forme' },
  { slug: 'urshifu-rapid-strike', num: '892', zh: '武道熊师 连击流', en: 'Urshifu Rapid Strike Style' },
  { slug: 'greninja-ash',         num: '658', zh: '甲贺忍蛙 小智', en: "Ash-Greninja" },
];

async function main() {
  const results = [];
  for (const e of ENTRIES) {
    try {
      const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${e.slug}`);
      const home = data?.sprites?.other?.home?.front_default;
      const artwork = data?.sprites?.other?.['official-artwork']?.front_default;
      const basic = data?.sprites?.front_default;
      const sprite = home || artwork || basic;
      results.push({
        id: e.slug,
        num: String(e.num).padStart(4, '0'),
        numInt: parseInt(e.num),
        zh: e.zh,
        en: e.en,
        sprite,
        section: 'event'
      });
      console.log('OK', e.slug, 'id=' + data.id, home ? 'home=yes' : 'home=NO');
    } catch(err) {
      console.log('MISS', e.slug, err.message);
    }
    await sleep(300);
  }
  fs.writeFileSync('./data/event-sprites.json', JSON.stringify(results, null, 2));
  console.log('Saved', results.length, 'entries to event-sprites.json');
}

main();
