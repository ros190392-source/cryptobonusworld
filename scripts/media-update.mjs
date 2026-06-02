#!/usr/bin/env node
/**
 * media-update.mjs — Safe screenshot replacement with automatic cache-busting
 *
 * Usage:
 *   node scripts/media-update.mjs <source-file> <canonical-name> [--deploy]
 *
 * Examples:
 *   node scripts/media-update.mjs "C:\path\to\new.jpg" bybit-step-05
 *   node scripts/media-update.mjs "C:\path\to\new.png" bybit-p2p-bank --deploy
 *
 * What it does:
 *   1. Computes SHA-256 content hash of source file (8 chars)
 *   2. Copies to public/media/walkthroughs/{exchange}/{canonical}-{hash}.{ext}
 *   3. Updates ALL references in src/ from old filename → new filename
 *   4. Optionally runs clean build + deploy (--deploy flag)
 *
 * Why hash-based names:
 *   Cloudflare caches static assets with max-age=1y immutable.
 *   A new filename = guaranteed cache MISS = user sees new image immediately.
 */

import { createHash }                                       from 'crypto';
import { readFileSync, writeFileSync, copyFileSync,
         readdirSync, statSync, existsSync, mkdirSync }     from 'fs';
import { extname, join, resolve, dirname }                  from 'path';
import { fileURLToPath }                                    from 'url';
import { execSync }                                         from 'child_process';

// ── Config ──────────────────────────────────────────────────────────────────
const SSH_KEY  = `${process.env.HOME || process.env.USERPROFILE}/.ssh/cryptovek_id`;
const SERVER   = 'root@23.88.106.140';
const WEB_ROOT = '/var/www/cryptobonusworld/html';
const SITE_URL = 'https://cryptobonusworld.com';

// ── Paths ────────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

// ── Args ─────────────────────────────────────────────────────────────────────
const raw        = process.argv.slice(2);
const deployFlag = raw.includes('--deploy');
const dryRun     = raw.includes('--dry-run');
const args       = raw.filter(a => !a.startsWith('--'));

const [sourcePath, canonicalName] = args;

if (!sourcePath || !canonicalName) {
  console.error(`
❌  Missing arguments

    Usage:   node scripts/media-update.mjs <source-file> <canonical-name> [--deploy]
    Dry run: node scripts/media-update.mjs <source-file> <canonical-name> --dry-run

    Examples:
      node scripts/media-update.mjs "C:\\path\\to\\new.jpg" bybit-step-05 --deploy
      node scripts/media-update.mjs ~/Desktop/bank.png     bybit-p2p-bank
`);
  process.exit(1);
}

// ── Resolve source ───────────────────────────────────────────────────────────
const absSource = resolve(
  sourcePath.replace(/^~/, process.env.HOME || process.env.USERPROFILE || '~')
);

if (!existsSync(absSource)) {
  console.error(`\n❌  Source file not found: ${absSource}\n`);
  process.exit(1);
}

// ── Hash & filename ──────────────────────────────────────────────────────────
const fileContent = readFileSync(absSource);
const hash        = createHash('sha256').update(fileContent).digest('hex').slice(0, 8);
const ext         = extname(absSource).toLowerCase();
const newFilename = `${canonicalName}-${hash}${ext}`;

// ── Target directory ─────────────────────────────────────────────────────────
// Infer exchange from canonical name prefix (bybit-*, mexc-*, okx-*, etc.)
const exchange  = canonicalName.split('-')[0];
const targetDir = join(ROOT, 'public', 'media', 'walkthroughs', exchange);

if (!existsSync(targetDir) && !dryRun) {
  mkdirSync(targetDir, { recursive: true });
}

const targetPath    = join(targetDir, newFilename);
const publicRef     = `/media/walkthroughs/${exchange}/${newFilename}`;
const sizeKb        = (fileContent.length / 1024).toFixed(1);

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  media-update  ${dryRun ? '[DRY RUN] ' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Source:    ${absSource}
  Canonical: ${canonicalName}
  Hash:      ${hash}
  New file:  ${newFilename}  (${sizeKb} KB)
  Public:    ${publicRef}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// ── Copy file ────────────────────────────────────────────────────────────────
if (!dryRun) {
  copyFileSync(absSource, targetPath);
  console.log(`✅  Copied → ${targetPath.replace(ROOT, '').replace(/\\/g, '/')}`);
}

// ── Find & update references in src/ ─────────────────────────────────────────
function walkDir(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkDir(full, exts, out);
    } else if (exts.some(e => full.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const searchDirs = ['src/data', 'src/pages', 'src/components'].map(d => join(ROOT, d));
const files      = searchDirs.flatMap(d => walkDir(d, ['.ts', '.astro', '.tsx', '.js']));

// Match: canonical + any suffix + any image extension
// Handles: bybit-step-05.jpg, bybit-step-05-v2.jpg, bybit-step-05-abc12345.jpg
const escaped = canonicalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(`${escaped}[a-zA-Z0-9-]*\\.(?:jpg|jpeg|png|webp|gif|avif)`, 'gi');

let updatedFiles = 0;
const replacements = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (!pattern.test(text)) continue;
  pattern.lastIndex = 0;

  const matches = [...text.matchAll(pattern)];
  const oldNames = [...new Set(matches.map(m => m[0]))];
  replacements.push(...oldNames);

  if (!dryRun) {
    pattern.lastIndex = 0;
    const updated = text.replace(pattern, newFilename);
    writeFileSync(file, updated, 'utf8');
  }

  updatedFiles++;
  const rel = file.replace(ROOT, '').replace(/\\/g, '/');
  console.log(`  📝  ${dryRun ? '[would update]' : 'Updated:'} ${rel}`);
  console.log(`       ${oldNames.join(', ')} → ${newFilename}`);
}

if (updatedFiles === 0) {
  console.log(`\n⚠️   No existing references found for "${canonicalName}"`);
  console.log(`    Add manually to your data file:`);
  console.log(`    src: '${publicRef}'`);
}

// ── Deploy ───────────────────────────────────────────────────────────────────
if (deployFlag && !dryRun) {
  console.log('\n🔨  Building (clean)...');
  execSync('node scripts/deploy.mjs', { stdio: 'inherit', cwd: ROOT });
} else if (!dryRun) {
  console.log(`
  Run to deploy:
    npm run deploy
  Or build only:
    npm run build
`);
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${dryRun ? 'DRY RUN COMPLETE' : 'DONE'}
  File:  public/media/walkthroughs/${exchange}/${newFilename}
  URL:   ${SITE_URL}/media/walkthroughs/${exchange}/${newFilename}
  Refs:  ${updatedFiles} file(s) updated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
