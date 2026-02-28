// Fix HTML entities in serebii-normal.json names -> main-timeline.json
const fs = require('fs');

function decodeEntities(str) {
  return str
    .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É')
    .replace(/&aacute;/g, 'á').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

const tl = JSON.parse(fs.readFileSync('../public/data/main-timeline.json','utf-8'));
let fixed = 0;
tl.forEach(p => {
  const origEn = p.en;
  const origZh = p.zh;
  p.en = decodeEntities(p.en || '');
  p.zh = decodeEntities(p.zh || '');
  if (p.en !== origEn || p.zh !== origZh) {
    fixed++;
    console.log('Fixed:', p.num, JSON.stringify(origEn), '->', JSON.stringify(p.en));
  }
});
console.log('Total fixed:', fixed);
fs.writeFileSync('../public/data/main-timeline.json', JSON.stringify(tl, null, 2), 'utf-8');
