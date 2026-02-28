/**
 * migrate-remaining-sprites.cjs — Download, upload, and update remaining sprites
 * that weren't handled by the initial download (Serebii suffix URLs and
 * PokeAPI non-HOME URLs).
 *
 * Naming: Uses the entry's `id` field as the R2 key (e.g., "a-rattata.png").
 * This avoids collisions with the numeric-ID sprites already uploaded.
 *
 * Usage: node scripts/migrate-remaining-sprites.cjs [--upload] [--update-json]
 *   No flags: download only (dry run for upload/update)
 *   --upload:  download + upload to R2
 *   --update-json: download + upload + update JSON files
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const R2_BASE = 'https://pub-aa43740e9f1f450ca7cd054cdf60d907.r2.dev';
const BUCKET = 'pokedex-sprites';
const SPRITES_DIR = path.join(__dirname, '..', 'sprites');
const VARIANT_DIR = path.join(SPRITES_DIR, 'variants');
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const CONCURRENCY = 3;

const doUpload = process.argv.includes('--upload') || process.argv.includes('--update-json');
const doUpdateJson = process.argv.includes('--update-json');

/** Check if a URL is already an R2 URL */
function isR2Url(url) {
  return url && url.startsWith(R2_BASE);
}

/** Check if a URL can be matched to a numeric-only ID */
function hasNumericId(url) {
  if (!url) return false;
  if (url.includes('blank')) return false;
  // Only match URLs ending in pure numeric .png (e.g., /001.png, /10091.png)
  const match = url.match(/\/(\d+)\.png$/);
  return !!match;
}

/** Download a file from URL */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });

    const doRequest = (requestUrl, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      client.get(requestUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return doRequest(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${requestUrl}`));
          res.resume();
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', (err) => { fs.unlinkSync(dest); reject(err); });
      }).on('error', reject);
    };
    doRequest(url);
  });
}

/** Upload a single file to R2 */
function uploadToR2(localPath, r2Key) {
  return new Promise((resolve) => {
    const cmd = `wrangler r2 object put "${BUCKET}/${r2Key}" --file "${localPath}" --content-type "image/png" --remote`;
    exec(cmd, { timeout: 60000 }, (err) => {
      resolve(!err);
    });
  });
}

/** Collect entries that need migration */
function collectRemaining(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const remaining = [];
  for (const entry of data) {
    if (isR2Url(entry.sprite)) continue; // Already migrated
    if (!entry.sprite || entry.sprite.includes('blank')) continue; // No sprite
    remaining.push(entry);
  }
  return remaining;
}

async function processQueue(tasks, concurrency, fn) {
  let idx = 0;
  let ok = 0;
  let fail = 0;
  const failures = [];

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        await fn(tasks[i]);
        ok++;
      } catch (err) {
        fail++;
        failures.push({ item: tasks[i], error: err.message });
      }
      const total = ok + fail;
      if (total % 10 === 0 || total === tasks.length) {
        process.stdout.write(`\r  ${total}/${tasks.length} (${ok} ok, ${fail} failed)`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  console.log();
  return { ok, fail, failures };
}

async function main() {
  const mainFile = path.join(DATA_DIR, 'main-timeline.json');
  const formsFile = path.join(DATA_DIR, 'forms.json');

  const mainRemaining = collectRemaining(mainFile);
  const formsRemaining = collectRemaining(formsFile);
  const allRemaining = [...mainRemaining, ...formsRemaining];

  // Deduplicate by sprite URL (different entries may share the same sprite)
  const urlToEntries = new Map();
  for (const entry of allRemaining) {
    if (!urlToEntries.has(entry.sprite)) {
      urlToEntries.set(entry.sprite, []);
    }
    urlToEntries.get(entry.sprite).push(entry);
  }

  console.log(`Remaining sprites: ${allRemaining.length} entries, ${urlToEntries.size} unique URLs`);

  // Build download tasks: use "variant/{entryId}" as key to avoid collision
  // For deduplication, use the first entry's id as the filename
  const downloadTasks = [];
  for (const [url, entries] of urlToEntries) {
    const primaryId = entries[0].id;
    const localName = `${primaryId}.png`;
    const localPath = path.join(VARIANT_DIR, localName);
    const r2Key = `variant/${localName}`;
    downloadTasks.push({ url, localPath, r2Key, entries, primaryId });
  }

  // Step 1: Download
  fs.mkdirSync(VARIANT_DIR, { recursive: true });
  console.log(`\nStep 1: Downloading ${downloadTasks.length} sprites...`);
  const dlResult = await processQueue(downloadTasks, 5, async (task) => {
    if (fs.existsSync(task.localPath) && fs.statSync(task.localPath).size > 100) {
      return; // Already downloaded
    }
    await downloadFile(task.url, task.localPath);
  });
  console.log(`  Downloads: ${dlResult.ok} ok, ${dlResult.fail} failed`);
  if (dlResult.failures.length > 0) {
    console.log('  Failed downloads:');
    for (const f of dlResult.failures.slice(0, 10)) {
      console.log(`    ${f.item.primaryId}: ${f.error}`);
    }
    if (dlResult.failures.length > 10) {
      console.log(`    ... and ${dlResult.failures.length - 10} more`);
    }
  }

  if (!doUpload) {
    console.log('\nDry run complete. Use --upload to upload to R2, --update-json to also update data files.');
    return;
  }

  // Step 2: Upload to R2
  const uploadTasks = downloadTasks.filter(t => fs.existsSync(t.localPath) && fs.statSync(t.localPath).size > 100);
  console.log(`\nStep 2: Uploading ${uploadTasks.length} sprites to R2...`);
  const ulResult = await processQueue(uploadTasks, CONCURRENCY, async (task) => {
    const ok = await uploadToR2(task.localPath, task.r2Key);
    if (!ok) throw new Error('Upload failed');
  });
  console.log(`  Uploads: ${ulResult.ok} ok, ${ulResult.fail} failed`);

  if (!doUpdateJson) {
    console.log('\nUpload complete. Use --update-json to also update data files.');
    return;
  }

  // Step 3: Update JSON files
  console.log('\nStep 3: Updating JSON files...');

  // Build mapping: originalUrl → R2 URL
  const urlToR2 = new Map();
  for (const task of uploadTasks) {
    const r2Url = `${R2_BASE}/${task.r2Key}`;
    urlToR2.set(task.url, r2Url);
  }

  function updateJsonFile(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let updated = 0;
    const result = data.map(entry => {
      if (urlToR2.has(entry.sprite)) {
        updated++;
        return { ...entry, sprite: urlToR2.get(entry.sprite) };
      }
      return entry;
    });
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2) + '\n', 'utf8');
    return updated;
  }

  const mainUpdated = updateJsonFile(mainFile);
  const formsUpdated = updateJsonFile(formsFile);
  console.log(`  main-timeline.json: ${mainUpdated} updated`);
  console.log(`  forms.json: ${formsUpdated} updated`);
  console.log('\nDone! All sprites migrated to R2.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
