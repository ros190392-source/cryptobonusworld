#!/usr/bin/env node
/**
 * deploy.mjs — Clean build + deploy to production
 *
 * Usage:
 *   npm run deploy
 *   node scripts/deploy.mjs
 */

import { execSync, execFileSync } from 'child_process';
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

// Correct POSIX single-argument quoting: wrap the whole value in single quotes
// and render any embedded single quote as the '\'' sequence (close, escaped
// quote, reopen). Used only for values parsed by the REMOTE Unix shell, so a
// remote path can never be reinterpreted as remote shell syntax. This is a full
// quoter — not a spaces-only replacement.
function quotePosixShellArg(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
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

  // User: POSIX-style account name only — letters/digits/underscore/hyphen,
  // not starting with a digit or hyphen. Rejects whitespace, empty and any
  // shell metacharacter. (Error names the variable only, never its value.)
  if (!/^[A-Za-z_][A-Za-z0-9_-]{0,31}$/.test(user)) {
    failConfig(
      'CBW_DEPLOY_USER must be a valid Unix account name ' +
      '(letters, digits, underscore, hyphen; no whitespace or shell metacharacters).'
    );
  }

  // Host: DNS hostname or IP literal only — letters/digits/dot/hyphen, plus
  // colon for IPv6 literals. Rejects whitespace, control and shell metacharacters.
  if (!/^[A-Za-z0-9.:_-]+$/.test(host)) {
    failConfig(
      'CBW_DEPLOY_HOST must be a plain DNS hostname or IP literal ' +
      '(no whitespace, control characters or shell metacharacters).'
    );
  }

  // Port: integer 1..65535.
  const portRaw = (process.env.CBW_DEPLOY_PORT || '22').trim();
  const port = Number.parseInt(portRaw, 10);
  if (!/^\d+$/.test(portRaw) || !Number.isInteger(port) || port < 1 || port > 65535) {
    failConfig('CBW_DEPLOY_PORT must be an integer from 1 through 65535.');
  }

  // Remote path: non-empty absolute POSIX path; reject NUL/CR/LF. It is never
  // passed to the local shell and is POSIX-quoted before use in the remote shell.
  const remotePath =
    (process.env.CBW_DEPLOY_REMOTE_PATH || '').trim() ||
    '/var/www/cryptobonusworld/html';
  if (!remotePath.startsWith('/') || /[\0\r\n]/.test(remotePath)) {
    failConfig(
      'CBW_DEPLOY_REMOTE_PATH must be a non-empty absolute POSIX path ' +
      'with no NUL, CR or LF characters.'
    );
  }

  // Key path: must resolve to an existing file. It is supplied later as a
  // separate process argument (never shell-concatenated); private-key contents
  // are never read or printed.
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

// Public-key-only, host-key-verified transport options as discrete argv
// elements (no shell interpolation). BatchMode disables every interactive
// prompt, so a broken key fails closed instead of prompting for a password.
const SSH_OPT_ARGS = [
  '-o', 'BatchMode=yes',
  '-o', 'PasswordAuthentication=no',
  '-o', 'KbdInteractiveAuthentication=no',
  '-o', 'PreferredAuthentications=publickey',
  '-o', 'IdentitiesOnly=yes',
  '-o', 'StrictHostKeyChecking=yes',
];

// Shell helper for static local build commands (no operator-controlled input).
function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

// Argument-array helper for ssh/scp: shell:false means operator-controlled
// values are passed as literal argv elements and can never be reinterpreted as
// local shell syntax. The step label is logged instead of the raw arguments so
// host, user and key path do not land in deploy logs.
function runFile(exe, args, label) {
  console.log(`\n$ ${exe} ${label}`);
  execFileSync(exe, args, { stdio: 'inherit', cwd: ROOT, shell: false });
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

// 4. Upload — scp destination is a single process argument (no local shell).
console.log('\n⬆️   Uploading...');
runFile('scp', [
  ...SSH_OPT_ARGS,
  '-P', String(CFG.port),
  '-i', CFG.keyPath,
  'dist.tar.gz',
  `${SERVER}:/tmp/`,
], '[upload dist.tar.gz → remote /tmp/]');

// 5. Deploy on server — the remote command is one argv element; the remote
// path is POSIX-quoted so the REMOTE shell treats it as a single argument.
console.log('\n🚀  Deploying on server...');
const remoteRoot = quotePosixShellArg(WEB_ROOT);
const remoteCommand =
  `rm -rf ${remoteRoot}/* && ` +
  `tar xzf /tmp/dist.tar.gz -C ${remoteRoot}/ && ` +
  `rm /tmp/dist.tar.gz && echo SERVER_DONE`;
runFile('ssh', [
  ...SSH_OPT_ARGS,
  '-p', String(CFG.port),
  '-i', CFG.keyPath,
  SERVER,
  remoteCommand,
], '[remote deploy]');

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
