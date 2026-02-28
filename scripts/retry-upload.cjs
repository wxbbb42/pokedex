/**
 * retry-upload.cjs — Retry failed R2 uploads with low concurrency.
 * Usage: node scripts/retry-upload.cjs
 */
const { exec } = require('child_process');
const path = require('path');

const BUCKET = 'pokedex-sprites';
const SPRITES_DIR = path.join(__dirname, '..', 'sprites');
const CONCURRENCY = 3; // Low concurrency to avoid rate limits

const FAILED = [
  '10040.png','1007.png','1005.png','10141.png','10244.png','10232.png','10237.png',
  '10243.png','10273.png','120.png','137.png','173.png','168.png','170.png','195.png',
  '236.png','225.png','269.png','27.png','270.png','279.png','286.png','297.png',
  '307.png','30.png','327.png','326.png','328.png','329.png','373.png','37.png',
  '40.png','387.png','41.png','430.png','426.png','446.png','458.png','50.png',
  '493.png','520.png','615.png','619.png','635.png','634.png','626.png','649.png',
  '63.png','629.png','647.png','666.png','687.png','722.png','739.png','744.png',
  '76.png','781.png','77.png','799.png','783.png','786.png','805.png','812.png',
  '816.png','86.png','915.png','936.png','961.png','954.png','947.png','948.png',
  '949.png','99.png','973.png',
  'shiny/10002.png','shiny/10003.png','shiny/10011.png','shiny/10012.png',
  'shiny/10015.png','shiny/10018.png','shiny/10016.png','shiny/1004.png',
  'shiny/10040.png','shiny/1005.png','shiny/10104.png','shiny/10105.png',
  'shiny/10107.png','shiny/10137.png','shiny/10126.png','shiny/1014.png',
  'shiny/10140.png','shiny/1015.png','shiny/10165.png','shiny/10196.png',
  'shiny/10194.png','shiny/10207.png','shiny/10198.png','shiny/10252.png',
  'shiny/126.png','shiny/144.png','shiny/146.png','shiny/147.png','shiny/141.png',
  'shiny/157.png','shiny/158.png','shiny/188.png','shiny/202.png','shiny/198.png',
  'shiny/219.png','shiny/22.png','shiny/228.png','shiny/220.png','shiny/227.png',
  'shiny/252.png','shiny/237.png','shiny/238.png','shiny/240.png','shiny/251.png',
  'shiny/264.png','shiny/27.png','shiny/341.png','shiny/342.png','shiny/368.png',
  'shiny/373.png','shiny/391.png','shiny/404.png','shiny/414.png','shiny/436.png',
  'shiny/445.png','shiny/444.png','shiny/466.png','shiny/484.png','shiny/480.png',
  'shiny/481.png','shiny/526.png','shiny/528.png','shiny/540.png','shiny/541.png',
  'shiny/542.png','shiny/543.png','shiny/547.png','shiny/554.png','shiny/558.png',
  'shiny/627.png','shiny/603.png','shiny/657.png','shiny/693.png','shiny/720.png',
  'shiny/729.png','shiny/731.png','shiny/733.png','shiny/736.png','shiny/741.png',
  'shiny/766.png','shiny/82.png','shiny/818.png','shiny/843.png','shiny/85.png',
  'shiny/864.png','shiny/924.png','shiny/925.png','shiny/927.png','shiny/929.png',
  'shiny/930.png','shiny/978.png','shiny/980.png','shiny/993.png','shiny/994.png',
  'shiny/998.png','shiny/999.png'
];

function uploadFile(key) {
  const fullPath = path.join(SPRITES_DIR, ...key.split('/'));
  return new Promise((resolve) => {
    const cmd = `wrangler r2 object put "${BUCKET}/${key}" --file "${fullPath}" --content-type "image/png" --remote`;
    exec(cmd, { timeout: 60000 }, (err) => {
      resolve({ key, ok: !err });
    });
  });
}

async function main() {
  console.log(`Retrying ${FAILED.length} failed uploads (concurrency: ${CONCURRENCY})`);

  let idx = 0;
  let uploaded = 0;
  let failed = 0;
  const stillFailed = [];

  async function worker() {
    while (idx < FAILED.length) {
      const i = idx++;
      const key = FAILED[i];
      const { ok } = await uploadFile(key);
      if (ok) {
        uploaded++;
      } else {
        failed++;
        stillFailed.push(key);
      }
      const total = uploaded + failed;
      if (total % 5 === 0 || total === FAILED.length) {
        process.stdout.write(`\r  ${total}/${FAILED.length} (${uploaded} ok, ${failed} failed)`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`\n\nDone: ${uploaded} uploaded, ${failed} still failed`);
  if (stillFailed.length > 0) {
    console.log('Still failed:', stillFailed.join(', '));
  }
}

main();
