/**
 * upload-sprites.cjs — Bulk upload sprites to Cloudflare R2.
 *
 * Uses wrangler CLI with parallel child processes for speed.
 * Usage: node scripts/upload-sprites.cjs
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUCKET = 'pokedex-sprites';
const SPRITES_DIR = path.join(__dirname, '..', 'sprites');
const CONCURRENCY = 15;

function getAllFiles(dir, prefix = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, key));
    } else if (entry.name.endsWith('.png')) {
      results.push({ fullPath, key });
    }
  }
  return results;
}

function uploadFile(fullPath, key) {
  return new Promise((resolve) => {
    const cmd = `wrangler r2 object put "${BUCKET}/${key}" --file "${fullPath}" --content-type "image/png" --remote`;
    exec(cmd, { timeout: 60000 }, (err) => {
      resolve(!err);
    });
  });
}

async function main() {
  const files = getAllFiles(SPRITES_DIR);
  console.log(`Found ${files.length} files to upload (concurrency: ${CONCURRENCY})`);

  let idx = 0;
  let uploaded = 0;
  let failed = 0;
  const failedFiles = [];

  async function worker() {
    while (idx < files.length) {
      const i = idx++;
      const { fullPath, key } = files[i];
      const ok = await uploadFile(fullPath, key);
      if (ok) {
        uploaded++;
      } else {
        failed++;
        failedFiles.push(key);
      }
      const total = uploaded + failed;
      if (total % 25 === 0 || total === files.length) {
        process.stdout.write(`\r  ${total}/${files.length} (${uploaded} ok, ${failed} failed)`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`\n\nDone: ${uploaded} uploaded, ${failed} failed`);
  if (failedFiles.length > 0) {
    console.log('Failed files:', failedFiles.join(', '));
  }
}

main();
