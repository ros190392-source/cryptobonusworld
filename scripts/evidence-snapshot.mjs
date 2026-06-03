#!/usr/bin/env node
/**
 * evidence-snapshot.mjs — Evidence Snapshot System
 * ──────────────────────────────────────────────────
 * Generates structured JSON evidence snapshots for every bonus verification run.
 * Stores per-exchange snapshot, tracks screenshot hashes, and maintains an index.
 *
 * Directory layout:
 *   reports/evidence-snapshots/
 *     {exchange}-{region}-{YYYY-MM-DD}.json   individual snapshots
 *     index.json                               machine-readable index
 *     index.md                                 human-readable summary
 *
 * Usage (as library — imported by verify-bonus-capture.mjs):
 *   import { saveEvidenceSnapshot, buildIndex } from './evidence-snapshot.mjs';
 *
 * Usage (CLI — rebuild index from existing snapshots):
 *   node scripts/evidence-snapshot.mjs --rebuild-index
 *   node scripts/evidence-snapshot.mjs --rebuild-index --verbose
 */

import { createHash }                              from 'crypto';
import { existsSync, mkdirSync, readFileSync,
         readdirSync, writeFileSync }              from 'fs';
import { join, dirname, basename }                 from 'path';
import { fileURLToPath }                           from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const SNAP_DIR  = join(ROOT, 'reports', 'evidence-snapshots');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV    = process.argv.slice(2);
const flag    = (n) => ARGV.includes(n);
const REBUILD = flag('--rebuild-index');
const VERBOSE = flag('--verbose');
const log     = (...a) => console.log(' ', ...a);
const dbg     = (...a) => VERBOSE && console.log('  ·', ...a);

// ── Hashing ───────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hash of a file. Returns null if file does not exist.
 * @param {string} filePath  Absolute path to file
 * @returns {string|null}
 */
export function hashFile(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  try {
    const buf = readFileSync(filePath);
    return createHash('sha256').update(buf).digest('hex');
  } catch { return null; }
}

/**
 * Compare current screenshot hash against the most recent snapshot for the
 * same exchange + region. Returns true if the screenshot has changed.
 *
 * @param {string} exchange
 * @param {string} region
 * @param {string|null} currentHash
 * @returns {{ changed: boolean, previousHash: string|null }}
 */
export function detectScreenshotChange(exchange, region, currentHash) {
  if (!currentHash) return { changed: false, previousHash: null };

  ensureSnapDir();
  const existing = loadSnapshotsForExchange(exchange, region);
  if (existing.length === 0) return { changed: false, previousHash: null };

  // Most recent previous snapshot
  existing.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const prev = existing[0];
  const previousHash = prev.screenshotHash ?? null;

  if (!previousHash) return { changed: false, previousHash: null };
  return { changed: previousHash !== currentHash, previousHash };
}

// ── Snapshot I/O ──────────────────────────────────────────────────────────────

function ensureSnapDir() {
  if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });
}

/**
 * Load all existing snapshots for a given exchange + region.
 * @param {string} exchange
 * @param {string} region
 * @returns {object[]}
 */
function loadSnapshotsForExchange(exchange, region) {
  ensureSnapDir();
  const prefix = `${exchange}-${region.toLowerCase()}-`;
  return readdirSync(SNAP_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json') && f !== 'index.json')
    .map(f => {
      try { return JSON.parse(readFileSync(join(SNAP_DIR, f), 'utf-8')); }
      catch { return null; }
    })
    .filter(Boolean);
}

/**
 * Save a structured evidence snapshot JSON.
 *
 * @param {object} opts
 * @param {string}      opts.exchange
 * @param {string}      opts.region             e.g. 'GLOBAL'
 * @param {string}      opts.locale             e.g. 'en-US'
 * @param {string}      opts.affiliateUrl
 * @param {string}      opts.finalUrl
 * @param {string[]}    opts.redirectChain
 * @param {number|null} opts.expectedBonus       numeric USDT amount
 * @param {number|null} opts.detectedBonus
 * @param {string|null} opts.expectedPromoCode
 * @param {string|null} opts.detectedPromoCode
 * @param {string}      opts.matchStatus
 * @param {string}      opts.severity
 * @param {string|null} opts.textEvidencePath    relative path from repo root
 * @param {string|null} opts.screenshotAbsPath   absolute path, used for hashing
 * @param {string|null} opts.screenshotRelPath   relative path stored in snapshot
 * @param {boolean}     opts.screenshotChanged
 * @param {string|null} opts.previousScreenshotHash
 * @returns {{ snapshotPath: string, snapshot: object }}
 */
export function saveEvidenceSnapshot(opts) {
  ensureSnapDir();

  const {
    exchange, region = 'GLOBAL', locale = 'en-US',
    affiliateUrl, finalUrl, redirectChain = [],
    expectedBonus, detectedBonus,
    expectedPromoCode, detectedPromoCode,
    matchStatus, severity,
    textEvidencePath,
    screenshotAbsPath, screenshotRelPath,
    screenshotChanged = false, previousScreenshotHash = null,
  } = opts;

  const capturedAt     = new Date().toISOString();
  const screenshotHash = hashFile(screenshotAbsPath);

  /** @type {string} */
  const expectedBonusStr = expectedBonus != null
    ? `${expectedBonus.toLocaleString('en-US')} USDT`
    : null;

  const snapshot = {
    exchange,
    region,
    locale,
    affiliateUrl:          affiliateUrl ?? null,
    finalUrl:              finalUrl ?? null,
    redirectChain,
    expectedBonus:         expectedBonusStr,
    detectedBonus:         detectedBonus != null
                             ? `${detectedBonus.toLocaleString('en-US')} USDT`
                             : null,
    expectedPromoCode:     expectedPromoCode ?? null,
    detectedPromoCode:     detectedPromoCode ?? null,
    matchStatus,
    severity,
    screenshotChanged,
    previousScreenshotHash,
    capturedAt,
    textEvidencePath:      textEvidencePath ?? null,
    screenshotPath:        screenshotRelPath ?? null,
    screenshotHash,
  };

  const dateTag = capturedAt.slice(0, 10); // YYYY-MM-DD
  const fileName = `${exchange}-${region.toLowerCase()}-${dateTag}.json`;
  const filePath = join(SNAP_DIR, fileName);

  writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
  dbg(`Saved snapshot: reports/evidence-snapshots/${fileName}`);

  return {
    snapshotPath: `reports/evidence-snapshots/${fileName}`,
    snapshot,
  };
}

// ── Index generation ──────────────────────────────────────────────────────────

/**
 * Read all individual snapshots and rebuild index.json + index.md.
 * Returns the index object.
 */
export function buildIndex() {
  ensureSnapDir();

  const files = readdirSync(SNAP_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .sort()
    .reverse(); // newest first

  const snapshots = files.map(f => {
    try { return JSON.parse(readFileSync(join(SNAP_DIR, f), 'utf-8')); }
    catch { return null; }
  }).filter(Boolean);

  // Latest per exchange+region
  const latestMap = {};
  for (const s of snapshots) {
    const key = `${s.exchange}:${s.region}`;
    if (!latestMap[key] || s.capturedAt > latestMap[key].capturedAt) {
      latestMap[key] = s;
    }
  }
  const latest = Object.values(latestMap).sort((a, b) =>
    `${a.exchange}:${a.region}`.localeCompare(`${b.exchange}:${b.region}`)
  );

  // Summary counts
  const total     = latest.length;
  const matched   = latest.filter(s => s.matchStatus === 'matched' || s.matchStatus === 'matched_with_copy_difference').length;
  const mismatch  = latest.filter(s => s.matchStatus === 'mismatch').length;
  const unknown   = latest.filter(s => s.matchStatus === 'unknown').length;
  const review    = latest.filter(s => s.matchStatus === 'needs_manual_review').length;
  const changed   = latest.filter(s => s.screenshotChanged).length;

  const indexData = {
    generatedAt: new Date().toISOString(),
    summary: { total, matched, mismatch, unknown, needsManualReview: review, screenshotChanged: changed },
    snapshots: latest,
    allFiles: files,
  };

  writeFileSync(join(SNAP_DIR, 'index.json'), JSON.stringify(indexData, null, 2), 'utf8');

  // Markdown index
  const now = new Date().toISOString().slice(0, 19) + 'Z';
  const statusIcon = (s) => {
    if (s.matchStatus === 'matched' || s.matchStatus === 'matched_with_copy_difference') return '✅';
    if (s.matchStatus === 'mismatch')          return '🚨';
    if (s.matchStatus === 'needs_manual_review') return '⚠️';
    return '❓';
  };

  const rows = latest.map(s => {
    const date = s.capturedAt?.slice(0, 10) ?? '—';
    const chg  = s.screenshotChanged ? '🔄' : '';
    const exp  = s.expectedBonus ?? '—';
    const det  = s.detectedBonus ?? '—';
    return `| ${statusIcon(s)} | \`${s.exchange}\` | ${s.region} | ${exp} | ${det} | ${s.detectedPromoCode ?? '—'} | ${date} | ${chg} |`;
  }).join('\n');

  const md = `# Evidence Snapshots Index
**Generated:** ${now}

## Summary
| Metric | Count |
|---|---|
| Total (latest per exchange/region) | ${total} |
| ✅ Matched | ${matched} |
| 🚨 Mismatch | ${mismatch} |
| ❓ Unknown | ${unknown} |
| ⚠️ Needs review | ${review} |
| 🔄 Screenshot changed | ${changed} |

## Latest Snapshots

| Status | Exchange | Region | Expected Bonus | Detected Bonus | Promo | Date | Changed |
|---|---|---|---|---|---|---|---|
${rows || '| — | — | — | — | — | — | — | — |'}

## All snapshot files
${files.map(f => `- \`reports/evidence-snapshots/${f}\``).join('\n') || '_none yet_'}

*Index rebuilt from ${files.length} snapshot files.*
`;

  writeFileSync(join(SNAP_DIR, 'index.md'), md, 'utf8');

  return indexData;
}

// ── Refresh queue ─────────────────────────────────────────────────────────────

/**
 * Add an entry to the screenshot refresh queue when a mismatch or screenshot
 * change is detected. Only adds if entry for this exchange doesn't already exist
 * with status pending_approval.
 *
 * @param {object} opts
 * @param {string}  opts.exchange
 * @param {string}  opts.region
 * @param {string}  opts.matchStatus
 * @param {boolean} opts.screenshotChanged
 * @param {string}  opts.affiliateUrl
 * @param {string|null} opts.finalUrl
 * @param {string}  opts.snapshotPath
 */
export function addToRefreshQueue(opts) {
  const queuePath = join(ROOT, 'reports', 'screenshot-refresh-queue.json');
  const {
    exchange, region, matchStatus, screenshotChanged,
    affiliateUrl, finalUrl, snapshotPath,
  } = opts;

  // Determine reason
  const reason = matchStatus === 'mismatch' ? 'bonus_changed'
               : matchStatus === 'unknown'  ? 'verification_unknown'
               : screenshotChanged          ? 'referral_landing_changed'
               : null;

  if (!reason) return; // nothing to queue

  let queue = { generatedAt: new Date().toISOString(), items: [] };
  if (existsSync(queuePath)) {
    try { queue = JSON.parse(readFileSync(queuePath, 'utf-8')); } catch {}
  }

  // Deduplicate: skip if this exchange already has a pending_approval entry
  const alreadyQueued = (queue.items ?? []).some(
    i => i.exchange === exchange && i.region === region && i.status === 'pending_approval'
  );
  if (alreadyQueued) {
    dbg(`Refresh queue: ${exchange}/${region} already pending, skipping`);
    return;
  }

  const entry = {
    exchange,
    region,
    status: 'pending_approval',
    reason,
    matchStatus,
    screenshotChanged,
    affiliateUrl,
    finalUrl: finalUrl ?? null,
    snapshotPath,
    categories: ['bonus', 'bonus_referral_landing', 'registration'],
    addedAt: new Date().toISOString(),
    notes: `Auto-queued by evidence-snapshot.mjs — ${reason}`,
  };

  queue.items = [...(queue.items ?? []), entry];
  queue.generatedAt = new Date().toISOString();
  queue.summary = {
    total: queue.items.length,
    pending: queue.items.filter(i => i.status === 'pending_approval').length,
  };

  writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf8');
  dbg(`Refresh queue: added ${exchange}/${region} (${reason})`);
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

if (REBUILD) {
  log('');
  log('📸  Rebuilding evidence-snapshots index…');
  const idx = buildIndex();
  log(`  ✅  index.json + index.md written`);
  log(`  Total snapshots: ${idx.allFiles.length}`);
  log(`  Latest by exchange: ${idx.summary.total}`);
  log(`  Matched: ${idx.summary.matched}  Mismatch: ${idx.summary.mismatch}`);
  log(`  Unknown: ${idx.summary.unknown}  Changed: ${idx.summary.screenshotChanged}`);
  log('');
}
