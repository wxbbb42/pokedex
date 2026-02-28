const fs = require('fs');
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/';
const forms = JSON.parse(fs.readFileSync('../public/data/forms.json','utf8'));

const fixes = {
  'shellos-west':    BASE+'422.png',
  'shellos-east':    BASE+'10015.png',
  'gastrodon-west':  BASE+'423.png',
  'gastrodon-east':  BASE+'10016.png',
  'deerling-spring': BASE+'585.png',
  'deerling-summer': BASE+'10017.png',
  'deerling-autumn': BASE+'10018.png',
  'deerling-winter': BASE+'10019.png',
  'sawsbuck-spring': BASE+'586.png',
  'sawsbuck-summer': BASE+'10020.png',
  'sawsbuck-autumn': BASE+'10021.png',
  'sawsbuck-winter': BASE+'10022.png',
  'unown-a': BASE+'201.png',  'unown-b': BASE+'201.png',  'unown-c': BASE+'201.png',
  'unown-d': BASE+'201.png',  'unown-e': BASE+'201.png',  'unown-f': BASE+'201.png',
  'unown-g': BASE+'201.png',  'unown-h': BASE+'201.png',  'unown-i': BASE+'201.png',
  'unown-j': BASE+'201.png',  'unown-k': BASE+'201.png',  'unown-l': BASE+'201.png',
  'unown-m': BASE+'201.png',  'unown-n': BASE+'201.png',  'unown-o': BASE+'201.png',
  'unown-p': BASE+'201.png',  'unown-q': BASE+'201.png',  'unown-r': BASE+'201.png',
  'unown-s': BASE+'201.png',  'unown-t': BASE+'201.png',  'unown-u': BASE+'201.png',
  'unown-v': BASE+'201.png',  'unown-w': BASE+'201.png',  'unown-x': BASE+'201.png',
  'unown-y': BASE+'201.png',  'unown-z': BASE+'201.png',
  'unown-em': BASE+'10039.png',
  'unown-qu': BASE+'10040.png',
};

let fixed = 0;
forms.forEach(f => { if (fixes[f.id]) { f.sprite = fixes[f.id]; fixed++; } });
fs.writeFileSync('../public/data/forms.json', JSON.stringify(forms, null, 2));
console.log(`Fixed ${fixed} entries. Total: ${forms.length}`);
