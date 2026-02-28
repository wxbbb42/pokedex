/**
 * download-sprites.cjs — Download all Pokémon HOME sprites locally.
 *
 * Fetches from PokeAPI GitHub sprites (reliable, open-source).
 * Saves to: sprites/{id}.png (normal) and sprites/shiny/{id}.png
 *
 * Usage: node scripts/download-sprites.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const NORMAL_DIR = path.join(__dirname, '..', 'sprites');
const SHINY_DIR = path.join(NORMAL_DIR, 'shiny');
const CONCURRENCY = 10;
const RETRY_LIMIT = 3;
const RETRY_DELAY = 1000;

// PokeAPI HOME sprite base URLs
const NORMAL_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home';
const SHINY_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function downloadWithRetry(url, dest, retries = RETRY_LIMIT) {
  for (let i = 0; i < retries; i++) {
    try {
      await downloadFile(url, dest);
      return true;
    } catch (err) {
      if (i < retries - 1) {
        await sleep(RETRY_DELAY * (i + 1));
      } else {
        return false;
      }
    }
  }
  return false;
}

async function processQueue(tasks, concurrency) {
  let idx = 0;
  let completed = 0;
  let failed = 0;
  let skipped = 0;
  const total = tasks.length;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      const { id, url, dest } = tasks[i];

      // Skip if already downloaded
      if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
        skipped++;
        completed++;
        continue;
      }

      const ok = await downloadWithRetry(url, dest);
      completed++;
      if (ok) {
        if (completed % 100 === 0 || completed === total) {
          process.stdout.write(`\r  ${completed}/${total} (${failed} failed, ${skipped} skipped)`);
        }
      } else {
        failed++;
        console.error(`\n  FAILED: ${id} — ${url}`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  console.log(`\n  Done: ${completed - failed - skipped} downloaded, ${skipped} skipped, ${failed} failed`);
}

async function main() {
  // Load data
  const mainTimeline = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'main-timeline.json'), 'utf8'));
  const forms = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'forms.json'), 'utf8'));
  const allPokemon = [...mainTimeline, ...forms];

  // Extract unique PokeAPI IDs from sprite URLs
  const spriteMap = new Map(); // pokeapi_id → original_url
  for (const p of allPokemon) {
    const url = p.sprite;
    if (!url || url.includes('blank')) continue;

    // Extract numeric ID from either Serebii or PokeAPI URLs
    let pokeId;
    if (url.includes('serebii')) {
      // Serebii: /pokemonhome/pokemon/80/001.png → id 1
      const match = url.match(/\/(\d+)\.png/);
      if (match) pokeId = String(parseInt(match[1], 10)); // remove leading zeros
    } else if (url.includes('PokeAPI') || url.includes('pokeapi')) {
      const match = url.match(/\/(\d+)\.png/);
      if (match) pokeId = match[1];
    }

    if (pokeId && !spriteMap.has(pokeId)) {
      spriteMap.set(pokeId, url);
    }
  }

  console.log(`Found ${spriteMap.size} unique sprites to download`);

  // Create directories
  fs.mkdirSync(NORMAL_DIR, { recursive: true });
  fs.mkdirSync(SHINY_DIR, { recursive: true });

  // Build download tasks for normal sprites
  console.log('\nDownloading normal sprites...');
  const normalTasks = [...spriteMap.keys()].map(id => ({
    id,
    url: `${NORMAL_BASE}/${id}.png`,
    dest: path.join(NORMAL_DIR, `${id}.png`),
  }));
  await processQueue(normalTasks, CONCURRENCY);

  // Build download tasks for shiny sprites
  console.log('\nDownloading shiny sprites...');
  const shinyTasks = [...spriteMap.keys()].map(id => ({
    id,
    url: `${SHINY_BASE}/${id}.png`,
    dest: path.join(SHINY_DIR, `${id}.png`),
  }));
  await processQueue(shinyTasks, CONCURRENCY);

  // Report total size
  let totalBytes = 0;
  const countFiles = (dir) => {
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      if (stat.isFile()) totalBytes += stat.size;
      else if (stat.isDirectory()) countFiles(fp);
    }
  };
  countFiles(NORMAL_DIR);
  console.log(`\nTotal size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
