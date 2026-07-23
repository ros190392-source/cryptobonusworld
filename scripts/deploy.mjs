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

// ── Deployment configuration (environment-driven, public-key only) ───────────
//
// Required environment variables (deployment fails closed if any is missing):
//   CBW_DEPLOY_HOST        production host name or IP
//   CBW_DEPLOY_USER        deployment SSH user
//   CBW_DEPLOY_KEY_PATH    path to the private key used for public-key auth
//
// Optional environment variables (documented defaults):
//   CBW_DEPLOY_PORT        SSH port          (default: 22)
//   CBW_DEPLOY_REMOTE_PATH remote web root   (default: /var/www/cryptobonusworld/html)
//
// No password is read, accepted or supported. Host-key verification and
// public-key-only authentication are enforced on every ssh/scp call. See
// docs/security/CBW_DEPLOYMENT_CREDENTIALS_STANDARD_v1.md.

function failConfig(message) {
  console.error(`\nDeploy configuration error: ${message}`);
  process.exit(2);
}

function loadDeployConfig() {
  const host    = (process.env.CBW_DEPLOY_HOST     || '').trim();
  const user    = (process.env.CBW_DEPLOY_USER     || '').trim();
  const keyPath = (process.env.CBW_DEPLOY_KEY_PATH || '').trim();

  const missing = [
    ['CBW_DEPLOY_HOST', host],
    ['CBW_DEPLOY_USER', user],
    ['CBW_DEPLOY_KEY_PATH', keyPath],
  ].filter(([, v]) => !v).map(([name]) => name);

  if (missing.length) {
    failConfig(
      `missing required environment variable(s): ${missing.join(', ')}. ` +
      `Set them to production values in your local secret manager; do not ` +
      `hardcode them. Public-key authentication only.`
    );
  }

  const portRaw = (process.env.CBW_DEPLOY_PORT || '22').trim();
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isInteger(port) || port <= 0) {
    failConfig('CBW_DEPLOY_PORT must be a positive integer.');
  }

  const remotePath =
    (process.env.CBW_DEPLOY_REMOTE_PATH || '').trim() ||
    '/var/www/cryptobonusworld/html';

  if (!existsSync(keyPath)) {
    failConfig(
      'CBW_DEPLOY_KEY_PATH does not point to a readable private key file. ' +
      'Provide the path to your deployment SSH private key.'
    );
  }

  return { host, user, keyPath, port, remotePath };
}

const CFG = loadDeployConfig();
const SERVER = `${CFG.user}@${CFG.host}`;
const WEB_ROOT = CFG.remotePath;

// Public-key-only, host-key-verified transport options for ssh and scp.
// BatchMode disables all interactive prompts; the client falls back to no
// other auth method, so a broken key fails closed instead of prompting.
const SSH_HARDENING = [
  '-o BatchMode=yes',
  '-o PasswordAuthentication=no',
  '-o KbdInteractiveAuthentication=no',
  '-o PreferredAuthentications=publickey',
  '-o IdentitiesOnly=yes',
  '-o StrictHostKeyChecking=yes',
].join(' ');

// scp uses -P for port; ssh uses -p. Key path is quoted for paths with spaces.
const SCP_BASE = `scp ${SSH_HARDENING} -P ${CFG.port} -i "${CFG.keyPath}"`;
const SSH_BASE = `ssh ${SSH_HARDENING} -p ${CFG.port} -i "${CFG.keyPath}"`;

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
run(`${SCP_BASE} dist.tar.gz ${SERVER}:/tmp/`);

// 5. Deploy on server
console.log('\n🚀  Deploying on server...');
run(`${SSH_BASE} ${SERVER} "rm -rf ${WEB_ROOT}/* && tar xzf /tmp/dist.tar.gz -C ${WEB_ROOT}/ && rm /tmp/dist.tar.gz && echo SERVER_DONE"`);

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
    // Default deploy submits priority mode = tier1 money pages only
    // (/, /promo-codes/, /exchanges/, six live review pages).
    // Pass --full-indexnow for `all` mode = the full current sitemap set
    // (tier1 + trust/legal pages). Retired 301'd URLs are never submitted
    // on deploy — use `node scripts/indexnow.mjs --mode legacy` manually.
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
