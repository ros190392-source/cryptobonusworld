#!/usr/bin/env node
/**
 * bonus-review-queue-report.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Bonus Landing Verification — Result Classification + Review Queue
 *
 * PURPOSE:
 *   Reads all bonus-landing snapshot files from reports/bonus-landing-snapshots/
 *   Classifies each result into an ownerActionCategory
 *   Generates owner-readable review queue reports
 *
 * READS:
 *   reports/bonus-landing-snapshots/{date}/{exchange}-global.json
 *   reports/bonus-landing-snapshots/latest.json
 *
 * WRITES:
 *   reports/bonus-review-queue.json          — all actionable items
 *   reports/bonus-review-queue.md            — owner-readable queue report
 *   reports/bonus-landing-mismatches.json    — possible_mismatch entries only
 *   reports/bonus-landing-errors.json        — technical_error + blocked entries
 *
 * CLASSIFICATION CATEGORIES:
 *   confirmed_match      matchStatus=match AND confidenceScore >= 0.75
 *   possible_mismatch    matchStatus=mismatch
 *   needs_manual_review  matchStatus=needs_review OR confidence uncertain
 *   not_detected         page loaded but no bonus claim found
 *   blocked              captcha / anti-bot / geo-block / access wall
 *   technical_error      network / protocol / browser / timeout errors
 *   no_action            dry-run plan entries only (no live data)
 *
 * SAFE APPEND:
 *   De-duplicates on {exchange}_{capturedAt}. Newest entries appear first.
 *   Preserves prior entries across runs.
 *
 * FLAGS:
 *   --verbose    Show per-entry detail
 *   --json       (implicit — always writes JSON)
 *   --dry-run    Show what would be written without writing
 *
 * SAFETY:
 *   This script NEVER modifies any evidence JSON files.
 *   This script NEVER modifies any production pages.
 *   This script NEVER modifies affiliate URLs.
 *   Read-only from evidence; write-only to reports/.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── CLI flags ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const DRY_RUN = args.includes('--dry-run');

// Console helpers
const log = (...a) => console.log(' ', ...a);
const dbg = (...a) => VERBOSE && console.log('  ·', ...a);

// ─── Owner action category definitions ─────────────────────────────────────────

const CATEGORIES = {
  confirmed_match: {
    label:       'Confirmed Match',
    icon:        '✅',
    priority:    5,   // lowest urgency (5 = no action needed)
    description: 'Detected bonus matches expected value. Evidence is current.',
    recommendedOwnerAction: 'No action required. Evidence is current. Update lastChecked date in evidence.',
  },
  possible_mismatch: {
    label:       'Possible Mismatch',
    icon:        '⚠️',
    priority:    1,   // highest urgency
    description: 'Detected bonus amount/currency differs from expected. Evidence may be stale.',
    recommendedOwnerAction: 'Compare detected vs expected amount. Visit the URL manually to confirm. If changed, create a bonus update proposal and update evidence facts after human approval.',
  },
  needs_manual_review: {
    label:       'Needs Manual Review',
    icon:        '🔍',
    priority:    2,
    description: 'Bonus presence detected but amount uncertain, or confidence too low to auto-classify.',
    recommendedOwnerAction: 'Visit the capture URL manually. Check the screenshot. If bonus amount is visible, update evidence. If the bonus has changed or been removed, create a proposal.',
  },
  not_detected: {
    label:       'Not Detected',
    icon:        '❓',
    priority:    2,
    description: 'Page loaded successfully but no bonus claim was found in visible text.',
    recommendedOwnerAction: 'Visit the URL manually to check if the bonus is still displayed. May indicate a page redesign, A/B test, or bonus removal. Update evidence if confirmed changed.',
  },
  blocked: {
    label:       'Blocked / Access Denied',
    icon:        '🚫',
    priority:    3,
    description: 'CAPTCHA, anti-bot protection, geo-block, or login wall detected.',
    recommendedOwnerAction: 'Verify the URL manually in a browser. If the bonus is still accessible to real users, the block is environmental (no action on evidence). If the URL has changed, update captureUrl in affiliate data.',
  },
  technical_error: {
    label:       'Technical Error',
    icon:        '❌',
    priority:    3,
    description: 'Network, protocol, browser, or page error during capture. No data collected.',
    recommendedOwnerAction: 'Check if the URL is still valid. Retry manually. If persistent across multiple runs, the affiliate URL may have changed — verify and update if needed.',
  },
  no_action: {
    label:       'No Action (Dry-Run)',
    icon:        '—',
    priority:    6,
    description: 'Dry-run plan entry only. No live verification has been performed.',
    recommendedOwnerAction: 'Run live verification when ready: npm run bonus:landing:live:bybit (replace bybit with target exchange slug).',
  },
};

// ─── Classification logic ───────────────────────────────────────────────────────

/**
 * Classify a single live snapshot into an ownerActionCategory.
 * @param {object} snapshot  A BonusLandingSnapshot object from a live run JSON file.
 * @returns {string}  One of the CATEGORIES keys.
 */
function classifySnapshot(snapshot) {
  const { matchStatus, confidenceScore, captureError, manualReviewRequired } = snapshot;

  // Network / protocol / browser errors always → technical_error
  if (captureError || matchStatus === 'error') {
    // Distinguish blocked vs pure error where possible
    const errStr = (captureError ?? '').toLowerCase();
    const BLOCK_SIGNALS = ['captcha', 'cloudflare', 'access denied', 'challenge', 'verify you are human', 'just a moment', 'net::err_blocked', 'err_connection_refused'];
    if (BLOCK_SIGNALS.some(s => errStr.includes(s))) {
      return 'blocked';
    }
    return 'technical_error';
  }

  // Explicit captcha/block from detection logic
  if (matchStatus === 'blocked') {
    return 'blocked';
  }

  // Confirmed match: high-confidence detection agrees with expected
  if (matchStatus === 'match' && confidenceScore >= 0.75) {
    return 'confirmed_match';
  }

  // Match but low confidence — still needs a human look
  if (matchStatus === 'match' && confidenceScore < 0.75) {
    return 'needs_manual_review';
  }

  // Detected but differs from expected
  if (matchStatus === 'mismatch') {
    return 'possible_mismatch';
  }

  // Page loaded, nothing detected
  if (matchStatus === 'not_detected') {
    return 'not_detected';
  }

  // Explicit needs_review from detection
  if (matchStatus === 'needs_review') {
    return 'needs_manual_review';
  }

  // manualReviewRequired flag set but no other category matched
  if (manualReviewRequired) {
    return 'needs_manual_review';
  }

  // Should not reach here, but default to needs_manual_review to be safe
  return 'needs_manual_review';
}

// ─── Snapshot discovery ─────────────────────────────────────────────────────────

/**
 * Walk reports/bonus-landing-snapshots/{date}/{exchange}-global.json
 * Returns array of { file, snapshot } objects, newest date first.
 */
function discoverSnapshots() {
  const snapshotRoot = path.join(ROOT, 'reports', 'bonus-landing-snapshots');
  const discovered   = [];

  if (!fs.existsSync(snapshotRoot)) {
    dbg('No snapshots directory found.');
    return discovered;
  }

  // Enumerate date directories
  let dateDirs;
  try {
    dateDirs = fs.readdirSync(snapshotRoot, { withFileTypes: true })
      .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
      .sort((a, b) => b.name.localeCompare(a.name));  // newest first
  } catch (e) {
    dbg(`Cannot read snapshot root: ${e.message}`);
    return discovered;
  }

  for (const dateDir of dateDirs) {
    const dateStr = dateDir.name;
    const dirPath = path.join(snapshotRoot, dateStr);
    let files;
    try {
      files = fs.readdirSync(dirPath).filter(f => f.endsWith('-global.json'));
    } catch { continue; }

    for (const fname of files) {
      const fpath = path.join(dirPath, fname);
      try {
        const raw      = fs.readFileSync(fpath, 'utf8');
        const snapshot = JSON.parse(raw);
        discovered.push({
          file:     `reports/bonus-landing-snapshots/${dateStr}/${fname}`,
          dateStr,
          snapshot,
        });
        dbg(`Loaded: ${dateStr}/${fname}`);
      } catch (e) {
        dbg(`Skip malformed: ${fname} — ${e.message}`);
      }
    }
  }

  return discovered;
}

// ─── Build queue entries ────────────────────────────────────────────────────────

function buildQueueEntry(discovered) {
  const { file, snapshot } = discovered;
  const category  = classifySnapshot(snapshot);
  const catDef    = CATEGORIES[category];

  // Error summary (trimmed for report readability)
  let errorSummary = null;
  if (snapshot.captureError) {
    // Strip ANSI escape codes and trim to first meaningful line
    const cleaned = snapshot.captureError
      .replace(/\x1b\[[0-9;]*m/g, '')  // strip ANSI
      .split('\n')[0]
      .trim();
    errorSummary = cleaned.slice(0, 200);
  }

  return {
    // Identity
    exchange:             snapshot.exchange,
    region:               snapshot.region ?? 'GLOBAL',
    runId:                snapshot.runId,
    runDate:              snapshot.capturedAt?.split('T')[0] ?? null,

    // URLs
    sourceGoUrl:          snapshot.sourceGoUrl,
    captureUrl:           snapshot.affiliateUrl,
    finalUrl:             snapshot.finalUrl,

    // Expected vs detected
    expectedBonus:        snapshot.expectedBonus,
    detectedBonus:        snapshot.detectedBonus,

    // Verdict
    matchStatus:          snapshot.matchStatus,
    ownerActionCategory:  category,
    categoryLabel:        catDef.label,
    categoryIcon:         catDef.icon,
    urgencyPriority:      catDef.priority,
    confidenceScore:      snapshot.confidenceScore,
    manualReviewRequired: snapshot.manualReviewRequired,

    // Evidence
    screenshotPath:       snapshot.screenshotPath,
    snapshotPath:         file,
    capturedAt:           snapshot.capturedAt,

    // Error detail
    errorSummary,

    // Owner guidance
    recommendedOwnerAction: catDef.recommendedOwnerAction,
  };
}

// ─── Safe-append queue files ────────────────────────────────────────────────────

/**
 * Read existing queue JSON, merge with new entries, de-duplicate on dedupeKey,
 * sort newest first. Returns merged array.
 */
function mergeQueue(existingPath, newEntries, dedupeKey) {
  let existing = [];
  if (fs.existsSync(existingPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
      existing = Array.isArray(parsed.entries) ? parsed.entries : [];
    } catch { /* start fresh if corrupt */ }
  }

  // Build de-dupe map from existing (key → entry)
  const seen = new Map();
  for (const e of existing) {
    const k = dedupeKey(e);
    if (k && !seen.has(k)) seen.set(k, e);
  }

  // Add new entries — new takes precedence over existing same-key
  for (const e of newEntries) {
    const k = dedupeKey(e);
    if (k) seen.set(k, e);  // overwrites older entry with same key
  }

  // Sort: by urgencyPriority asc, then capturedAt desc (newest first)
  const merged = [...seen.values()].sort((a, b) => {
    const pa = a.urgencyPriority ?? 9;
    const pb = b.urgencyPriority ?? 9;
    if (pa !== pb) return pa - pb;
    return (b.capturedAt ?? '').localeCompare(a.capturedAt ?? '');
  });

  return merged;
}

// ─── Markdown queue report ──────────────────────────────────────────────────────

function buildMarkdownReport(allEntries, generatedAt) {
  const lines = [];

  // Counts by category
  const counts = {};
  for (const cat of Object.keys(CATEGORIES)) counts[cat] = 0;
  for (const e of allEntries) counts[e.ownerActionCategory] = (counts[e.ownerActionCategory] ?? 0) + 1;

  const actionable  = allEntries.filter(e => e.ownerActionCategory !== 'confirmed_match' && e.ownerActionCategory !== 'no_action');
  const critical    = allEntries.filter(e => e.urgencyPriority <= 2);
  const errors      = allEntries.filter(e => ['technical_error', 'blocked'].includes(e.ownerActionCategory));

  lines.push('# Bonus Landing Verification — Owner Review Queue');
  lines.push('');
  lines.push(`> Generated: ${generatedAt}  `);
  lines.push(`> Total snapshots: ${allEntries.length}  `);
  lines.push(`> Actionable: ${actionable.length}  `);
  lines.push('> ⚠️ **No production data has been changed automatically.**');
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('| Category | Icon | Count | Urgency |');
  lines.push('|----------|------|-------|---------|');
  for (const [cat, def] of Object.entries(CATEGORIES)) {
    const cnt = counts[cat] ?? 0;
    if (cnt === 0) continue;
    const urgLabel = def.priority <= 1 ? '🔴 Critical' : def.priority <= 2 ? '🟠 High' : def.priority <= 3 ? '🟡 Medium' : '🟢 Low';
    lines.push(`| ${def.label} | ${def.icon} | ${cnt} | ${urgLabel} |`);
  }
  lines.push('');

  if (critical.length > 0) {
    lines.push('### 🔴 Critical / High-Priority Items');
    lines.push('');
    for (const e of critical) {
      const catDef = CATEGORIES[e.ownerActionCategory];
      lines.push(`- **${e.exchange.toUpperCase()}** — ${catDef.icon} ${catDef.label}`);
      lines.push(`  - Expected: ${e.expectedBonus?.amount ?? '—'} ${e.expectedBonus?.currency ?? ''}`);
      lines.push(`  - Detected: ${e.detectedBonus?.amount ?? '—'} ${e.detectedBonus?.currency ?? ''}`);
      lines.push(`  - Captured: ${e.capturedAt}`);
      lines.push(`  - Action: *${e.recommendedOwnerAction}*`);
      lines.push('');
    }
  }

  if (errors.length > 0) {
    lines.push('### Technical Errors / Blocked');
    lines.push('');
    for (const e of errors) {
      const catDef = CATEGORIES[e.ownerActionCategory];
      lines.push(`- **${e.exchange.toUpperCase()}** — ${catDef.icon} ${catDef.label}`);
      lines.push(`  - Capture URL: \`${e.captureUrl ?? '—'}\``);
      lines.push(`  - Final URL: \`${e.finalUrl ?? '—'}\``);
      if (e.errorSummary) {
        lines.push(`  - Error: \`${e.errorSummary}\``);
      }
      lines.push(`  - Action: *${e.recommendedOwnerAction}*`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');

  // ── Full review queue table
  lines.push('## Full Review Queue');
  lines.push('');
  lines.push('| Exchange | Category | Match Status | Expected | Detected | Conf | Captured | Manual Review |');
  lines.push('|----------|----------|-------------|---------|---------|------|---------|--------------|');

  for (const e of allEntries) {
    const catDef = CATEGORIES[e.ownerActionCategory];
    const exp    = e.expectedBonus?.amount != null ? `${e.expectedBonus.amount} ${e.expectedBonus.currency ?? ''}` : '—';
    const det    = e.detectedBonus?.amount != null ? `${e.detectedBonus.amount} ${e.detectedBonus.currency ?? ''}` : '—';
    const conf   = e.confidenceScore?.toFixed(2) ?? 'n/a';
    const date   = e.capturedAt?.split('T')[0] ?? '—';
    const rev    = e.manualReviewRequired ? '⚠️ Yes' : '✅ No';
    lines.push(`| **${e.exchange}** | ${catDef.icon} ${catDef.label} | \`${e.matchStatus}\` | ${exp} | ${det} | ${conf} | ${date} | ${rev} |`);
  }
  lines.push('');

  // ── Per-exchange detail
  lines.push('---');
  lines.push('');
  lines.push('## Per-Exchange Detail');
  lines.push('');

  for (const e of allEntries) {
    const catDef = CATEGORIES[e.ownerActionCategory];
    lines.push(`### ${catDef.icon} ${e.exchange.toUpperCase()}`);
    lines.push('');
    lines.push(`**Category:** ${catDef.label}  `);
    lines.push(`**Description:** ${catDef.description}`);
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('|-------|-------|');
    lines.push(`| Match Status | \`${e.matchStatus}\` |`);
    lines.push(`| Owner Category | **${catDef.label}** |`);
    lines.push(`| Expected Bonus | ${e.expectedBonus?.amount ?? '—'} ${e.expectedBonus?.currency ?? ''} |`);
    lines.push(`| Expected Confidence | ${e.expectedBonus?.confidence ?? 'n/a'} |`);
    lines.push(`| Expected Conflict Status | ${e.expectedBonus?.conflictStatus ?? 'n/a'} |`);
    lines.push(`| Detected Bonus | ${e.detectedBonus?.amount ?? '—'} ${e.detectedBonus?.currency ?? ''} |`);
    lines.push(`| Detection Pattern | \`${e.detectedBonus?.pattern ?? 'none'}\` |`);
    lines.push(`| Detected Raw Text | ${e.detectedBonus?.rawText ? `\`${String(e.detectedBonus.rawText).slice(0, 80)}\`` : '—'} |`);
    lines.push(`| Capture URL | \`${e.captureUrl ?? '—'}\` |`);
    lines.push(`| Final URL | \`${e.finalUrl ?? '—'}\` |`);
    lines.push(`| Go URL | ${e.sourceGoUrl ?? '—'} |`);
    lines.push(`| Confidence Score | ${e.confidenceScore ?? 'n/a'} |`);
    lines.push(`| Manual Review | ${e.manualReviewRequired ? '⚠️ **Yes**' : '✅ No'} |`);
    lines.push(`| Screenshot | ${e.screenshotPath ?? '—'} |`);
    lines.push(`| Snapshot | \`${e.snapshotPath}\` |`);
    lines.push(`| Captured At | ${e.capturedAt} |`);
    if (e.errorSummary) {
      lines.push(`| Error | \`${e.errorSummary}\` |`);
    }
    lines.push('');
    lines.push(`**Recommended Action:** ${e.recommendedOwnerAction}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // ── Suggested next actions
  lines.push('## Suggested Next Actions');
  lines.push('');

  const hasMismatch   = counts.possible_mismatch > 0;
  const hasNotDet     = counts.not_detected > 0;
  const hasBlocked    = counts.blocked > 0;
  const hasTechError  = counts.technical_error > 0;
  const hasManual     = counts.needs_manual_review > 0;

  if (hasMismatch) {
    lines.push('- 🔴 **Investigate mismatch(es):** Visit the capture URL(s) manually. Compare the live bonus amount to what is shown in evidence. If confirmed changed, update the evidence JSON after human review.');
  }
  if (hasNotDet) {
    lines.push('- 🟠 **Check not-detected pages:** Open the capture URL in a real browser. If the bonus is displayed, the detection regex may need tuning. If the bonus is gone, update evidence.');
  }
  if (hasManual) {
    lines.push('- 🟠 **Review uncertain results:** Open snapshot and screenshot. Confirm bonus amount. Update evidence if changed.');
  }
  if (hasBlocked) {
    lines.push('- 🟡 **Retry blocked pages manually:** Open the capture URL in a real browser. If accessible, the block is environmental (headless detection). Consider updating capture strategy or noting manually.');
  }
  if (hasTechError) {
    lines.push('- 🟡 **Diagnose technical errors:** Check if capture URLs are still valid. Run `npm run bonus:landing:live:<slug>` again. Persistent failures may indicate changed or expired affiliate URLs.');
  }
  if (!hasMismatch && !hasNotDet && !hasManual && !hasBlocked && !hasTechError) {
    lines.push('- ✅ No urgent action needed. All verifications are confirmed matches.');
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Safety Confirmation');
  lines.push('');
  lines.push('- ✅ No production evidence files were modified');
  lines.push('- ✅ No affiliate URLs were modified');
  lines.push('- ✅ No pages were logged into');
  lines.push('- ✅ No forms were submitted');
  lines.push('- ✅ No CAPTCHAs were bypassed');
  lines.push('- ✅ All changes require human approval before affecting live data');
  lines.push('');
  lines.push(`*Script: scripts/bonus-review-queue-report.mjs — See: [BONUS_LANDING_VERIFICATION_ARCHITECTURE.md](../docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md)*`);

  return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  log('');
  log('══════════════════════════════════════════════════════════');
  log('  Bonus Landing Verification — Review Queue Report');
  log('══════════════════════════════════════════════════════════');
  log('');

  // Discover all snapshots
  const discovered = discoverSnapshots();
  log(`  Snapshots found: ${discovered.length}`);

  if (discovered.length === 0) {
    log('');
    log('  ℹ️  No live snapshots found.');
    log('     Run a live verification first:');
    log('       npm run bonus:landing:live:bybit');
    log('');
    log('  Writing empty queue files…');
  }

  // Build queue entries from discovered snapshots
  const newEntries = discovered.map(buildQueueEntry);

  // Log per-entry classification
  for (const e of newEntries) {
    const catDef = CATEGORIES[e.ownerActionCategory];
    dbg(`${e.exchange.padEnd(12)} → ${catDef.icon} ${e.ownerActionCategory} (matchStatus: ${e.matchStatus})`);
  }

  // Deduplication key: exchange + capturedAt (ISO string)
  const dedupeKey = e => `${e.exchange}__${e.capturedAt ?? ''}`;

  // ── Merge with existing queue files
  const reportsDir = path.join(ROOT, 'reports');
  if (!DRY_RUN) fs.mkdirSync(reportsDir, { recursive: true });

  // bonus-review-queue.json — all entries
  const allQueuePath = path.join(reportsDir, 'bonus-review-queue.json');
  const allMerged    = mergeQueue(allQueuePath, newEntries, dedupeKey);

  // bonus-landing-mismatches.json — possible_mismatch only
  const mismatchPath = path.join(reportsDir, 'bonus-landing-mismatches.json');
  const mismatchNew  = newEntries.filter(e => e.ownerActionCategory === 'possible_mismatch');
  const mismatchAll  = mergeQueue(mismatchPath, mismatchNew, dedupeKey);

  // bonus-landing-errors.json — technical_error + blocked
  const errorsPath = path.join(reportsDir, 'bonus-landing-errors.json');
  const errorsNew  = newEntries.filter(e => ['technical_error', 'blocked'].includes(e.ownerActionCategory));
  const errorsAll  = mergeQueue(errorsPath, errorsNew, dedupeKey);

  // ── Stats
  const counts = {};
  for (const cat of Object.keys(CATEGORIES)) counts[cat] = 0;
  for (const e of allMerged) counts[e.ownerActionCategory] = (counts[e.ownerActionCategory] ?? 0) + 1;

  const actionable = allMerged.filter(e => !['confirmed_match', 'no_action'].includes(e.ownerActionCategory));

  log('');
  log('  Classification summary:');
  for (const [cat, def] of Object.entries(CATEGORIES)) {
    const cnt = counts[cat] ?? 0;
    if (cnt > 0) log(`    ${def.icon}  ${def.label.padEnd(28)} ${cnt}`);
  }
  log('');
  log(`  Total in queue: ${allMerged.length}`);
  log(`  Actionable:     ${actionable.length}`);
  log(`  Mismatches:     ${mismatchAll.length}`);
  log(`  Errors:         ${errorsAll.length}`);
  log('');

  const generatedAt = new Date().toISOString();

  // ── Write files
  const toWrite = [
    {
      path:    allQueuePath,
      content: JSON.stringify({ generatedAt, totalEntries: allMerged.length, actionableCount: actionable.length, entries: allMerged }, null, 2),
      label:   'bonus-review-queue.json',
    },
    {
      path:    mismatchPath,
      content: JSON.stringify({ generatedAt, totalEntries: mismatchAll.length, entries: mismatchAll }, null, 2),
      label:   'bonus-landing-mismatches.json',
    },
    {
      path:    errorsPath,
      content: JSON.stringify({ generatedAt, totalEntries: errorsAll.length, entries: errorsAll }, null, 2),
      label:   'bonus-landing-errors.json',
    },
    {
      path:    path.join(reportsDir, 'bonus-review-queue.md'),
      content: buildMarkdownReport(allMerged, generatedAt),
      label:   'bonus-review-queue.md',
    },
  ];

  for (const { path: p, content, label } of toWrite) {
    if (DRY_RUN) {
      log(`  [dry-run] Would write: ${label} (${content.length} bytes)`);
    } else {
      fs.writeFileSync(p, content, 'utf8');
      log(`  📄 Written: ${label}`);
    }
  }

  log('');

  // ── Critical alerts to stdout
  const critical = allMerged.filter(e => e.urgencyPriority <= 2);
  if (critical.length > 0) {
    log('  ⚠️  ITEMS REQUIRING OWNER REVIEW:');
    log('');
    for (const e of critical) {
      const catDef = CATEGORIES[e.ownerActionCategory];
      log(`     ${catDef.icon} ${e.exchange.toUpperCase()} — ${catDef.label}`);
      log(`        Action: ${e.recommendedOwnerAction.slice(0, 100)}…`);
    }
    log('');
  }

  const techErrors = allMerged.filter(e => e.ownerActionCategory === 'technical_error');
  if (techErrors.length > 0) {
    log('  ❌ TECHNICAL ERRORS (network/protocol/browser):');
    for (const e of techErrors) {
      log(`     ${e.exchange.toUpperCase()} — ${e.errorSummary ?? 'unknown error'}`);
    }
    log('');
  }

  log('  ℹ️  No production data was modified.');
  log('     Review queue files are in reports/ (gitignored).');
  log('');

  // Exit 0 always — errors in snapshot are expected and properly classified
  process.exit(0);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(2);
});
