const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise(r => {
    https.get(url, {headers:{'User-Agent':'LP/1.0'}}, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { r(JSON.parse(d)); } catch { r(null); } });
    }).on('error', () => r(null));
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const pokemon = JSON.parse(fs.readFileSync('../public/data/pokemon.json'));
  let fixed = 0;
  const BATCH = 15;

  for (let i = 0; i < pokemon.length; i += BATCH) {
    const batch = pokemon.slice(i, i + BATCH);
    await Promise.all(batch.map(async p => {
      const spec = await get(`https://pokeapi.co/api/v2/pokemon-species/${p.id}/`);
      if (!spec) return;
      const zhHans = spec.names.find(n => n.language.name === 'zh-hans');
      const zhHant = spec.names.find(n => n.language.name === 'zh-hant');
      const en = spec.names.find(n => n.language.name === 'en');
      p.zh = (zhHans || zhHant || en || {}).name || p.zh;
      p.en = (en || {}).name || p.en;
      if (zhHans || zhHant) fixed++;
    }));
    await sleep(600);
    process.stdout.write(`${Math.min(i+BATCH, pokemon.length)}/1025 (fixed: ${fixed})\n`);
  }

  fs.writeFileSync('../public/data/pokemon.json', JSON.stringify(pokemon, null, 2));
  console.log(`Done. Fixed ${fixed} Chinese names.`);
}
main();
