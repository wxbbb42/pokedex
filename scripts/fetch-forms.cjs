const https = require('https');
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {headers:{'User-Agent':'LivingPokedex/1.0'}}, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const formSlugs = [
  'vivillon-icy-snow','vivillon-polar','vivillon-tundra','vivillon-continental',
  'vivillon-garden','vivillon-elegant','vivillon-meadow','vivillon-modern',
  'vivillon-marine','vivillon-archipelago','vivillon-high-plains','vivillon-sandstorm',
  'vivillon-river','vivillon-monsoon','vivillon-savanna','vivillon-sun','vivillon-ocean','vivillon-jungle',
  'flabebe-red','flabebe-yellow','flabebe-orange','flabebe-blue','flabebe-white',
  'floette-red','floette-yellow','floette-orange','floette-blue','floette-white',
  'florges-red','florges-yellow','florges-orange','florges-blue','florges-white',
  'furfrou-heart','furfrou-star','furfrou-diamond','furfrou-debutante',
  'furfrou-matron','furfrou-dandy','furfrou-la-reine','furfrou-pharaoh','furfrou-kabuki',
  'minior-red-core','minior-orange-core','minior-yellow-core','minior-green-core',
  'minior-blue-core','minior-indigo-core','minior-violet-core',
  'poltchageist-artisan','sinistcha-masterpiece'
];

// Gender diff sprites
const genderIds = [25, 415, 449, 450, 521, 592, 593, 668, 678, 876, 902, 916];

async function main() {
  const result = {};
  for (const slug of formSlugs) {
    const d = await get('https://pokeapi.co/api/v2/pokemon-form/' + slug + '/');
    result['form:'+slug] = (d && d.sprites && d.sprites.front_default) || null;
    process.stdout.write((result['form:'+slug] ? 'OK' : 'MISS') + ' ' + slug + '\n');
    await sleep(300);
  }
  for (const id of genderIds) {
    const d = await get('https://pokeapi.co/api/v2/pokemon/' + id + '/');
    const url = d && (
      (d.sprites.other && d.sprites.other.home && d.sprites.other.home.front_female) ||
      d.sprites.front_female
    );
    result['gender:'+id] = url || null;
    process.stdout.write((url ? 'OK' : 'MISS') + ' gender:' + id + '\n');
    await sleep(300);
  }
  require('fs').writeFileSync('./data/form-sprites.json', JSON.stringify(result));
  process.stdout.write('DONE\n');
}
main();
