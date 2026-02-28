/**
 * Patch main-timeline.json:
 * 1. Fix Vivillon pattern zh names
 * 2. Fix Alcremie cream/sweet zh names  
 * 3. Fix Tauros breeds
 * 4. Fix other miscategorized suffixes
 */
const fs = require('fs');
const timeline = JSON.parse(fs.readFileSync('../public/data/main-timeline.json', 'utf-8'));

// Vivillon pattern names (zh)
const VIVILLON_PATTERNS = {
  'p': '极地花纹', 't': '冻原花纹', 'c': '大陆花纹', 'g': '花园花纹',
  'e': '优雅花纹', 'i': '冰雪花纹', 'mo': '现代花纹', 'ma': '海洋花纹',
  'a': '群岛花纹', 'h': '高原花纹', 's': '沙漠花纹', 'r': '河川花纹',
  'mon': '季风花纹', 'sa': '热带花纹', 'su': '阳光花纹', 'o': '海浪花纹',
  'j': '丛林花纹', 'f': '华丽花纹', 'pb': '精灵球花纹',
  // Default (first one) = Meadow
};

// Alcremie cream/sweet codes
const ALCREMIE_CREAMS = {
  '': '香草奶油', 'rc': '红玉奶油', 'mac': '抹茶奶油', 'mic': '薄荷奶油',
  'lc': '柠檬奶油', 'sc': '盐味奶油', 'rs': '红玉漩涡', 'cs': '焦糖漩涡', 'ras': '彩虹漩涡',
};
const ALCREMIE_SWEETS = {
  '': '草莓糖', 'berry': '果实糖', 'love': '爱心糖', 'star': '星星糖',
  'clover': '三叶草糖', 'flower': '花朵糖', 'ribbon': '缎带糖',
};

function getAlcremieZh(serebiiFile) {
  // File format: 869[-creamcode[-sweetcode]].png
  const code = serebiiFile.replace('869', '').replace('.png', '').replace(/^-/, '');
  if (!code) return '霜奶仙 香草奶油·草莓糖';
  
  // Find which cream and sweet
  let creamCode = '', sweetCode = '';
  const creamKeys = Object.keys(ALCREMIE_CREAMS).filter(k => k !== '').sort((a,b) => b.length - a.length);
  for (const ck of creamKeys) {
    if (code.startsWith(ck)) {
      creamCode = ck;
      sweetCode = code.slice(ck.length).replace(/^-?/, '');
      break;
    }
  }
  if (!creamCode) sweetCode = code; // vanilla cream

  const creamZh = ALCREMIE_CREAMS[creamCode] || creamCode;
  const sweetZh = ALCREMIE_SWEETS[sweetCode] || sweetCode;
  return `霜奶仙 ${creamZh}·${sweetZh}`;
}

// Tauros Paldean breeds
const TAUROS_BREEDS = {
  '128-b': { zh: '帕底亚 肯泰罗 火焰种', en: 'Tauros Blaze Breed' },
  '128-a': { zh: '帕底亚 肯泰罗 水流种', en: 'Tauros Aqua Breed' },
};

// Furfrou trims
const FURFROU_TRIMS = {
  '676': { '-h': '爱心造型', '-s': '星星造型', '-d': '菱形造型', '-de': '出道造型',
           '-ma': '贵妇造型', '-da': '时髦造型', '-l': '法国造型', '-pau': '法老造型', '-j': '歌舞伎造型' },
};

// Form names patches for other unmapped
const ZH_PATCHES = {
  // Oricorio
  'serebii-741-b': '花舞鸟 火焰舞', 'serebii-741-pau': '花舞鸟 草裙舞', 'serebii-741-s': '花舞鸟 宴会舞',
  // Lycanroc
  'serebii-745-mi': '鬃岩狼人 正午形态', 'serebii-745-d': '鬃岩狼人 黄昏形态', 'serebii-745-mn': '鬃岩狼人 午夜形态',
  // Minior
  'serebii-774-o': '小陨星 橙色核心', 'serebii-774-y': '小陨星 黄色核心', 'serebii-774-g': '小陨星 绿色核心',
  'serebii-774-b': '小陨星 蓝色核心', 'serebii-774-i': '小陨星 靛色核心', 'serebii-774-v': '小陨星 紫色核心',
  // Toxtricity
  'serebii-849-l': '颤弦蝾螈 低调形态',
  // Morpeko
  'serebii-877-h': '莫鲁贝可 空腹模式',
  // Indeedee (male in forms, female is serebii)
  'serebii-876-f': '多宝秘密 ♀',
  // Basculegion
  'serebii-902-f': '王者斑纹鱼 ♀',
  // Oinkologne
  'serebii-916-f': '香香猪 ♀',
};

// Fix each entry
let patchCount = 0;
timeline.forEach(entry => {
  const file = entry.serebiiFile || '';
  const numInt = entry.numInt;

  // Vivillon (666)
  if (numInt === 666 && file && entry.id.startsWith('serebii-')) {
    const suffix = file.replace('666', '').replace('.png', '').replace(/^-/, '');
    const patternZh = VIVILLON_PATTERNS[suffix] || suffix;
    entry.zh = `彩粉蝶 ${patternZh}`;
    patchCount++;
  }

  // Alcremie (869)
  if (numInt === 869 && file && entry.id.startsWith('serebii-')) {
    entry.zh = getAlcremieZh(file);
    patchCount++;
  }

  // Tauros breeds
  const taurosKey = file ? file.replace('.png','') : '';
  if (TAUROS_BREEDS[taurosKey]) {
    entry.zh = TAUROS_BREEDS[taurosKey].zh;
    entry.en = TAUROS_BREEDS[taurosKey].en;
    patchCount++;
  }

  // General patches
  if (ZH_PATCHES[entry.id]) {
    entry.zh = ZH_PATCHES[entry.id];
    patchCount++;
  }
});

// Final stats
const stillSerebii = timeline.filter(e => e.id.startsWith('serebii-'));
console.log('Total entries:', timeline.length);
console.log('Patched:', patchCount);
console.log('Still serebii-id (zh auto-generated):', stillSerebii.length);
console.log('Sample remaining auto-zh:');
stillSerebii.slice(0, 15).forEach(e => console.log(' ', e.serebiiFile, '|', e.zh));

fs.writeFileSync('../public/data/main-timeline.json', JSON.stringify(timeline, null, 2), 'utf-8');
console.log('Saved!');
