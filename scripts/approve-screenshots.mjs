#!/usr/bin/env node
/**
 * approve-screenshots.mjs — CryptoBonusWorld Screenshot Approval Workflow
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Reads the harvest approval queue (reports/screenshot-approval-queue.json),
 * lets you approve or reject each item, and updates the evidence registry
 * (src/data/evidence/{exchange}.json) accordingly.
 *
 * On APPROVE:
 *   - Sets screenshot entry status → 'available'
 *   - Sets verified: true, verifiedAt: <now>
 *   - Moves processedPath entry to public/screenshots/ if not already there
 *   - Saves updated queue with item status → 'approved'
 *
 * On REJECT:
 *   - Sets screenshot entry status → 'missing' (triggers re-harvest next run)
 *   - Saves updated queue with item status → 'rejected', rejectionReason
 *   - Does NOT delete the processed file — keeps it for manual inspection
 *
 * Usage:
 *   npm run screenshots:approve -- --list
 *   npm run screenshots:approve -- --list --exchange binance
 *   npm run screenshots:approve -- --approve binance/registration
 *   npm run screenshots:approve -- --reject binance/deposit --reason "balance visible"
 *   npm run screenshots:approve -- --approve-all
 *   npm run screenshots:approve -- --approve-all --exchange binance
 *   npm run screenshots:approve -- --reject-failed
 *   npm run screenshots:approve -- --status         (summary counts only)
 *
 * Options:
 *   --list                        List pending items (default view)
 *   --list-all                    List all items including approved/rejected
 *   --approve <exchange/category> Approve one item
 *   --reject  <exchange/category> Reject one item
 *   --reason  <text>              Rejection reason (used with --reject)
 *   --approve-all                 Approve all pending items
 *   --reject-failed               Reject all items with status processing_failed or capture_failed
 *   --exchange <slug>             Filter to specific exchange
 *   --queue   <path>              Custom queue file (default: reports/screenshot-approval-queue.json)
 *   --dry-run                     Preview changes without writing
 *   --verbose                     Extra output
 *   --status                      Show counts summary only
 */

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, renameSync,
} from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV      = process.argv.slice(2);
const flag      = (n)     => ARGV.includes(n);
const opt       = (n, fb) => { const i = ARGV.indexOf(n); return i !== -1 && i+1 < ARGV.length ? ARGV[i+1] : (fb ?? null); };

const DO_LIST         = flag('--list') || ARGV.length === 0;
const DO_LIST_ALL     = flag('--list-all');
const DO_APPROVE      = opt('--approve');
const DO_REJECT       = opt('--reject');
const REJECT_REASON   = opt('--reason', 'manually rejected');
const DO_APPROVE_ALL  = flag('--approve-all');
const DO_REJECT_FAILED = flag('--reject-failed');
const EXCHANGE_FILTER = opt('--exchange');
const QUEUE_FILE      = opt('--queue', join(ROOT, 'reports', 'screenshot-approval-queue.json'));
const DRY_RUN         = flag('--dry-run');
const VERBOSE         = flag('--verbose');
const STATUS_ONLY     = flag('--status');

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);
const die  = (...a) => { console.error('\n  ✖', ...a, '\n'); process.exit(1); };

// ── Paths ─────────────────────────────────────────────────────────────────────

const EVIDENCE_DIR     = join(ROOT, 'src', 'data', 'evidence');
const SCREENSHOTS_DIR  = join(ROOT, 'public', 'screenshots');

// ── Load queue ────────────────────────────────────────────────────────────────

function loadQueue() {
  if (!existsSync(QUEUE_FILE)) {
    die(`Queue file not found: ${QUEUE_FILE}`, '\n  Run:  npm run screenshots:harvest -- --exchange <slug>');
  }
  try {
    const raw = readFileSync(QUEUE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    die(`Cannot parse queue file: ${e.message}`);
  }
}

function saveQueue(queue) {
  if (DRY_RUN) {
    dbg('DRY-RUN: would save queue to', QUEUE_FILE);
    return;
  }
  writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
  dbg('Queue saved:', QUEUE_FILE);
}

// ── Evidence registry ─────────────────────────────────────────────────────────

function loadEvidence(exchange) {
  const p = join(EVIDENCE_DIR, `${exchange}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch (e) {
    warn(`Cannot parse evidence file for ${exchange}: ${e.message}`);
    return null;
  }
}

function saveEvidence(exchange, data) {
  const p = join(EVIDENCE_DIR, `${exchange}.json`);
  if (DRY_RUN) {
    dbg(`DRY-RUN: would save evidence: ${p}`);
    return;
  }
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  dbg('Evidence saved:', p);
}

// ── Apply approval to evidence registry ───────────────────────────────────────

function applyApprovalToEvidence(item) {
  const { exchange, category, publicPath, processedPath } = item;

  const evidence = loadEvidence(exchange);
  if (!evidence) {
    warn(`No evidence file found for ${exchange} — skipping registry update`);
    return false;
  }

  if (!evidence.screenshots) evidence.screenshots = {};

  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Find or create the screenshot entry for this category
  const entry = evidence.screenshots[category] ?? {};

  entry.status     = 'available';
  entry.path       = publicPath ?? processedPath ?? null;
  entry.capturedAt = item.capturedAt ?? now;
  entry.geo        = item.geo        ?? 'global';
  entry.device     = item.device     ?? 'desktop';
  entry.verified   = true;
  entry.verifiedAt = new Date().toISOString();

  evidence.screenshots[category] = entry;

  saveEvidence(exchange, evidence);
  return true;
}

function applyRejectionToEvidence(item, reason) {
  const { exchange, category } = item;

  const evidence = loadEvidence(exchange);
  if (!evidence) {
    warn(`No evidence file for ${exchange} — skipping registry update`);
    return false;
  }

  if (!evidence.screenshots) evidence.screenshots = {};

  const entry = evidence.screenshots[category] ?? {};
  entry.status           = 'missing';
  entry.verified         = false;
  entry.rejectionReason  = reason;
  entry.rejectedAt       = new Date().toISOString();

  evidence.screenshots[category] = entry;

  saveEvidence(exchange, evidence);
  return true;
}

// ── Ensure processed file is in public/screenshots/ ───────────────────────────

function ensurePublicFile(item) {
  if (!item.processedPath || !existsSync(item.processedPath)) {
    dbg(`No processed file at: ${item.processedPath}`);
    return item.publicPath ?? null;
  }

  // If publicPath is different from processedPath, copy it
  if (item.publicPath && item.publicPath !== item.processedPath) {
    if (!existsSync(item.publicPath)) {
      const dir = dirname(item.publicPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      if (!DRY_RUN) {
        try {
          renameSync(item.processedPath, item.publicPath);
          dbg(`Moved: ${item.processedPath} → ${item.publicPath}`);
        } catch {
          // If rename fails (cross-device), copy instead
          copyFileSync(item.processedPath, item.publicPath);
          dbg(`Copied: ${item.processedPath} → ${item.publicPath}`);
        }
      } else {
        dbg(`DRY-RUN: would move ${basename(item.processedPath)} → ${item.publicPath}`);
      }
    }
    return item.publicPath;
  }

  return item.publicPath ?? item.processedPath;
}

// ── Format helpers ────────────────────────────────────────────────────────────

const STATUS_ICON = {
  pending_approval:  '🟡',
  approved:          '✅',
  rejected:          '❌',
  processing_failed: '🔴',
  capture_failed:    '🔴',
  safety_blocked:    '🔒',
  skipped:           '⏭',
};

function statusIcon(s) {
  return STATUS_ICON[s] ?? '❓';
}

function formatSize(kb) {
  if (!kb) return '';
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${kb}KB`;
}

// ── Item key ─────────────────────────────────────────────────────────────────

function itemKey(item) {
  return `${item.exchange}/${item.category}`;
}

// ── Core actions ──────────────────────────────────────────────────────────────

function approveItem(queue, key) {
  let matched = false;
  for (const item of queue.items) {
    if (itemKey(item) !== key) continue;
    if (item.status !== 'pending_approval') {
      warn(`Item ${key} has status "${item.status}" — can only approve pending_approval items`);
      continue;
    }
    matched = true;

    const finalPath = ensurePublicFile(item);
    const updatedItem = { ...item, publicPath: finalPath ?? item.publicPath };

    if (applyApprovalToEvidence(updatedItem)) {
      item.status     = 'approved';
      item.approvedAt = new Date().toISOString();
      item.publicPath = finalPath ?? item.publicPath;
      log(`  ✅  Approved: ${key}  →  ${item.publicPath ?? '(no path)'}`);
    } else {
      warn(`Evidence update failed for ${key}`);
    }
  }
  if (!matched) warn(`No pending_approval item found for key: ${key}`);
  return matched;
}

function rejectItem(queue, key, reason) {
  let matched = false;
  for (const item of queue.items) {
    if (itemKey(item) !== key) continue;
    matched = true;

    if (applyRejectionToEvidence(item, reason)) {
      item.status           = 'rejected';
      item.rejectedAt       = new Date().toISOString();
      item.rejectionReason  = reason;
      log(`  ❌  Rejected: ${key}  (${reason})`);
    } else {
      warn(`Evidence update failed for ${key}`);
    }
  }
  if (!matched) warn(`No item found for key: ${key}`);
  return matched;
}

// ── Display ───────────────────────────────────────────────────────────────────

function printStatusSummary(queue) {
  const counts = {};
  for (const item of queue.items) {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
  }
  const total = queue.items.length;

  log('');
  log(`📊  Screenshot Approval Queue — ${queue.exchange ?? 'all exchanges'}`);
  log('─'.repeat(52));
  for (const [status, n] of Object.entries(counts)) {
    log(`  ${statusIcon(status)}  ${status.padEnd(22)}  ${n}`);
  }
  log(`${''.padEnd(30)}  ─────`);
  log(`  ${'Total'.padEnd(28)}  ${total}`);
  log('');
  log(`  Queue file: ${QUEUE_FILE}`);
  log(`  Generated:  ${queue.generatedAt ?? 'unknown'}`);
  log('');
}

function printItemList(items, title) {
  if (!items.length) {
    log(`  (no items)`);
    return;
  }

  log('');
  log(`  ${title} (${items.length})`);
  log('─'.repeat(72));

  for (const item of items) {
    const icon   = statusIcon(item.status);
    const key    = itemKey(item).padEnd(32);
    const device = (item.device ?? 'desktop').padEnd(8);
    const geo    = (item.geo    ?? 'global').padEnd(8);
    const size   = item.processedSizeKB ? ` ${formatSize(item.processedSizeKB)}` : '';
    log(`  ${icon}  ${key}  ${device}  ${geo}${size}`);

    if (item.status === 'rejected' && item.rejectionReason) {
      log(`       reason: ${item.rejectionReason}`);
    }
    if (item.status === 'safety_blocked' && item.reason) {
      log(`       blocked: ${item.reason}`);
    }
    if ((item.status === 'processing_failed' || item.status === 'capture_failed') && item.reason) {
      log(`       error: ${item.reason}`);
    }
    if (VERBOSE && item.publicPath) {
      log(`       path: ${item.publicPath}`);
    }
  }
  log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const queue = loadQueue();

  // Apply exchange filter
  let items = queue.items ?? [];
  if (EXCHANGE_FILTER) {
    items = items.filter(i => i.exchange === EXCHANGE_FILTER);
  }

  // ── Status summary ────────────────────────────────────────────────────────
  if (STATUS_ONLY) {
    printStatusSummary({ ...queue, items });
    return;
  }

  // ── Approve single ────────────────────────────────────────────────────────
  if (DO_APPROVE) {
    const key = DO_APPROVE.trim();
    if (!key.includes('/')) die(`--approve expects "exchange/category" format, got: "${key}"`);
    approveItem({ ...queue, items }, key);
    saveQueue({ ...queue, items: queue.items }); // save full (unfiltered) queue
    return;
  }

  // ── Reject single ─────────────────────────────────────────────────────────
  if (DO_REJECT) {
    const key = DO_REJECT.trim();
    if (!key.includes('/')) die(`--reject expects "exchange/category" format, got: "${key}"`);
    rejectItem({ ...queue, items }, key, REJECT_REASON);
    saveQueue({ ...queue, items: queue.items });
    return;
  }

  // ── Approve all pending ───────────────────────────────────────────────────
  if (DO_APPROVE_ALL) {
    const pending = items.filter(i => i.status === 'pending_approval');
    if (!pending.length) {
      log('  No pending_approval items found.');
      return;
    }
    log(`\n  Approving ${pending.length} pending items${EXCHANGE_FILTER ? ` (${EXCHANGE_FILTER})` : ''}...\n`);
    for (const item of pending) {
      approveItem({ ...queue, items }, itemKey(item));
    }
    saveQueue({ ...queue, items: queue.items });
    log(`\n  Done. Run:  npm run build  to rebuild with new screenshots.\n`);
    return;
  }

  // ── Reject failed ─────────────────────────────────────────────────────────
  if (DO_REJECT_FAILED) {
    const failed = items.filter(i =>
      i.status === 'processing_failed' || i.status === 'capture_failed'
    );
    if (!failed.length) {
      log('  No failed items found.');
      return;
    }
    log(`\n  Rejecting ${failed.length} failed items...\n`);
    for (const item of failed) {
      rejectItem({ ...queue, items }, itemKey(item), 'processing or capture failed');
    }
    saveQueue({ ...queue, items: queue.items });
    return;
  }

  // ── List (default) ────────────────────────────────────────────────────────

  printStatusSummary({ ...queue, items });

  if (DO_LIST_ALL) {
    printItemList(items, 'All Items');
  } else {
    const pending = items.filter(i => i.status === 'pending_approval');
    const failed  = items.filter(i =>
      i.status === 'processing_failed' || i.status === 'capture_failed'
    );
    const blocked = items.filter(i => i.status === 'safety_blocked');

    if (pending.length) printItemList(pending, 'Pending Approval');
    if (failed.length)  printItemList(failed,  'Failed (need investigation)');
    if (blocked.length) printItemList(blocked,  'Safety Blocked (manual capture needed)');

    if (!pending.length && !failed.length && !blocked.length) {
      log('  ✅  Nothing pending. All items are approved, rejected, or skipped.');
    }
  }

  if (items.some(i => i.status === 'pending_approval')) {
    log('  To approve all pending:');
    log(`    npm run screenshots:approve -- --approve-all${EXCHANGE_FILTER ? ` --exchange ${EXCHANGE_FILTER}` : ''}`);
    log('');
    log('  To approve one item:');
    log('    npm run screenshots:approve -- --approve <exchange/category>');
    log('');
    log('  To reject one item:');
    log('    npm run screenshots:approve -- --reject <exchange/category> --reason "balance visible"');
    log('');
  }
}

main().catch(e => {
  console.error('\n  ✖ Approval error:', e.message);
  if (VERBOSE) console.error(e.stack);
  process.exit(1);
});
