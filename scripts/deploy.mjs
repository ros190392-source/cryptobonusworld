#!/usr/bin/env node
/**
 * deploy.mjs — Clean build + deploy to production
 *
 * Usage:
 *   npm run deploy
 *   node scripts/deploy.mjs
 */

import { execSync }   from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath }    from 'url';
import { rmSync, existsSync } from 'fs';
import { submitIndexNow } from './indexnow.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

const SSH_KEY  = `${process.env.HOME || process.env.USERPROFILE}/.ssh/cryptovek_id`;
const SERVER   = 'root@23.88.106.140';
const WEB_ROOT = '/var/www/cryptobonusworld/html';

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  CryptoBonusWorld — Deploy');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Clear dist + Astro cache
console.log('\n🗑️  Clearing dist and cache...');
if (existsSync(`${ROOT}/dist`)) {
  rmSync(`${ROOT}/dist`, { recursive: true, force: true });
  console.log('   ✓ dist removed');
}
if (existsSync(`${ROOT}/.astro`)) {
  rmSync(`${ROOT}/.astro`, { recursive: true, force: true });
  console.log('   ✓ .astro cache removed');
}

// 1b. Regenerate OG images (only if --regen-og flag is passed)
if (process.argv.includes('--regen-og')) {
  console.log('\n🖼️  Regenerating OG images...');
  run('python scripts/generate_og_images.py');
}

// 2. Build
console.log('\n🔨  Building...');
run('npx astro build');

// 3. Package
console.log('\n📦  Packaging...');
run('tar czf dist.tar.gz -C dist .');

// 4. Upload
console.log('\n⬆️   Uploading...');
run(`scp -i "${SSH_KEY}" dist.tar.gz ${SERVER}:/tmp/`);

// 5. Deploy on server
console.log('\n🚀  Deploying on server...');
run(`ssh -i "${SSH_KEY}" ${SERVER} "rm -rf ${WEB_ROOT}/* && tar xzf /tmp/dist.tar.gz -C ${WEB_ROOT}/ && rm /tmp/dist.tar.gz && echo SERVER_DONE"`);

// 6. Cleanup local
if (existsSync(`${ROOT}/dist.tar.gz`)) {
  rmSync(`${ROOT}/dist.tar.gz`);
  console.log('\n🧹  Cleaned up dist.tar.gz');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  ✅  Deploy complete!');
console.log('  🌐  https://cryptobonusworld.com');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 7. IndexNow — notify search engines of updated content
// Skip if --no-indexnow flag is passed (useful for debug/rollback deploys)
if (!process.argv.includes('--no-indexnow')) {
  console.log('🔔  Notifying search engines via IndexNow…');
  try {
    // Submit all URLs in priority mode (tier 1 + tier 2) on every deploy.
    // Use --mode all for a full sweep or --mode priority for a quick blast.
    const indexnowMode = process.argv.includes('--full-indexnow') ? 'all' : 'priority';
    const { ok, results } = await submitIndexNow(null, {
      silent: false,
      dryRun: process.argv.includes('--dry-run'),
      mode: process.argv.includes('--full-indexnow') ? 'all' : 'priority',
    });
    if (!ok) {
      console.warn('⚠️  IndexNow: some submissions failed — check logs/indexnow-submissions.jsonl');
    }
  } catch (e) {
    // Non-fatal — deploy succeeded even if IndexNow fails
    console.warn(`⚠️  IndexNow submission error (non-fatal): ${e.message}`);
  }
}
