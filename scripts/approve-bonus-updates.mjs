#!/usr/bin/env node
/**
 * approve-bonus-updates.mjs — Bonus Data Approval Flow
 * ─────────────────────────────────────────────────────
 * Reviews and applies bonus-verification update proposals to site source files.
 *
 * NEVER auto-applies without --approve flag.
 * After approval updates bonusLastChecked / offerLastChecked freshness fields.
 *
 * Usage:
 *   npm run bonus:proposals                              # List pending proposals
 *   npm run bonus:approve -- --exchange binance          # Approve for one exchange
 *   npm run bonus:approve -- --approve-all               # Approve all pending
 *   npm run bonus:approve -- --reject --exchange binance # Reject (mark do-not-apply)
 *   npm run bonus:approve -- --dry-run --exchange binance # Preview what would change
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV        = process.argv.slice(2);
const flag        = (n) => ARGV.includes(n);
const opt         = (n, fb) => { const i = ARGV.indexOf(n); return i !== -1 && i+1 < ARGV.length ? ARGV[i+1] : (fb ?? null); };

const LIST        = flag('--list') || (!flag('--approve') && !flag('--approve-all') && !flag('--reject') && !ARGV.find(a => a === '--exchange' && ARGV.indexOf(a) < ARGV.length-1));
const EXCHANGE    = opt('--exchange');
const APPROVE_ALL = flag('--approve-all');
const DO_APPROVE  = flag('--approve') || APPROVE_ALL;
const DO_REJECT   = flag('--reject');
const DRY_RUN     = flag('--dry-run');
const VERBOSE     = flag('--verbose');

const log  = (...a) => console.log(' ', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);
const die  = (...a) => { console.error('\n  ✖', ...a); process.exit(1); };

// ── Proposal store ────────────────────────────────────────────────────────────

const PROPOSALS_PATH = join(ROOT, 'reports', 'bonus-update-proposals.json');

function loadProposals() {
  if (!existsSync(PROPOSALS_PATH)) {
    return { proposals: [], generatedAt: null };
  }
  try {
    const raw = JSON.parse(readFileSync(PROPOSALS_PATH, 'utf-8'));
    return { proposals: raw.proposals ?? [], generatedAt: raw.generatedAt ?? null };
  } catch (e) {
    die(`Could not parse ${PROPOSALS_PATH}: ${e.message}`);
  }
}

function saveProposals(proposals, generatedAt) {
  const data = {
    generatedAt: generatedAt ?? new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
    summary: {
      total:    proposals.length,
      pending:  proposals.filter(p => p.status === 'pending').length,
      approved: proposals.filter(p => p.status === 'approved').length,
      rejected: proposals.filter(p => p.status === 'rejected').length,
    },
    proposals,
  };
  writeFileSync(PROPOSALS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ── Patching: exchanges.json ──────────────────────────────────────────────────

function patchExchangesJson(exchange, detectedBonus, detectedLabel, today) {
  const jsonPath = join(ROOT, 'src', 'data', 'exchanges.json');
  if (!existsSync(jsonPath)) { warn('exchanges.json not found — skipping'); return false; }

  const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const entry = data.find(e => e.slug === exchange);
  if (!entry) { warn(`${exchange} not found in exchanges.json — skipping`); return false; }

  const oldAmount = entry.bonusAmount;
  const oldTitle  = entry.bonusTitle;

  if (detectedBonus !== null) {
    entry.bonusAmount    = detectedBonus;
    entry.bonusTitle     = detectedLabel ?? entry.bonusTitle;
  }
  // Update freshness metadata
  entry.bonusLastChecked  = today;
  entry.offerLastChecked  = today;

  writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  log(`  exchanges.json patched: bonusAmount ${oldAmount} → ${detectedBonus ?? oldAmount}`);
  if (detectedLabel && oldTitle !== detectedLabel) {
    log(`  exchanges.json patched: bonusTitle updated`);
  }
  return true;
}

// ── Patching: affiliate-links.ts ──────────────────────────────────────────────

function patchAffiliateLinks(exchange, detectedBonus, detectedLabel, today) {
  const tsPath = join(ROOT, 'src', 'data', 'affiliate-links.ts');
  if (!existsSync(tsPath)) { warn('affiliate-links.ts not found — skipping'); return false; }

  let src = readFileSync(tsPath, 'utf-8');

  // Find the entry for this exchange and patch the relevant lines
  // Strategy: find the slug block and replace maxBonusAmount / bonusLabel / lastChecked
  const slugMarker = `slug: '${exchange}'`;
  const idx = src.indexOf(slugMarker);
  if (idx === -1) {
    warn(`${exchange} not found in affiliate-links.ts — skipping`);
    return false;
  }

  // Find next closing bracket pattern that ends the entry
  let patched = src;
  let changed  = false;

  if (detectedBonus !== null) {
    // Replace maxBonusAmount within the entry block (careful not to touch other entries)
    const entryStart = idx;
    const entryEnd   = findEntryEnd(src, idx);
    const block      = src.slice(entryStart, entryEnd);

    const newBlock = block
      .replace(/(maxBonusAmount:\s*)\d+/, `$1${detectedBonus}`)
      .replace(/(bonusLabel:\s*)'[^']+'/, `$1'${(detectedLabel ?? '').replace(/'/g, "\\'")}'`)
      .replace(/(lastChecked:\s*)'[\d-]+'/, `$1'${today}'`);

    if (newBlock !== block) {
      patched = src.slice(0, entryStart) + newBlock + src.slice(entryEnd);
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(tsPath, patched, 'utf8');
    log(`  affiliate-links.ts patched for ${exchange}`);
  } else {
    log(`  affiliate-links.ts: no numeric changes needed for ${exchange}`);
  }
  return true;
}

/** Find the end index of an affiliate entry object (after matching {}). */
function findEntryEnd(src, startIdx) {
  let depth  = 0;
  let inStr  = false;
  let strChar = '';
  for (let i = startIdx; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === strChar && src[i - 1] !== '\\') inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true; strChar = c;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return src.length;
}

// ── Patching: bonus-codes.ts ──────────────────────────────────────────────────

function patchBonusCodes(exchange, detectedBonus, today) {
  const tsPath = join(ROOT, 'src', 'data', 'bonus-codes.ts');
  if (!existsSync(tsPath)) { warn('bonus-codes.ts not found — skipping'); return false; }

  let src = readFileSync(tsPath, 'utf-8');
  const slugMarker = `exchangeSlug: '${exchange}'`;
  const idx = src.indexOf(slugMarker);
  if (idx === -1) {
    // not all exchanges have bonus-codes entries
    dbg(`${exchange} not in bonus-codes.ts`);
    return false;
  }

  if (detectedBonus === null) return false;

  const entryEnd = findEntryEnd(src, idx);
  const block    = src.slice(idx, entryEnd);
  const newBlock = block
    .replace(/(bonusAmount:\s*)\d+/, `$1${detectedBonus}`)
    .replace(/(verifiedAt:\s*)'[\d-]+'/, `$1'${today}'`);

  if (newBlock !== block) {
    const patched = src.slice(0, idx) + newBlock + src.slice(entryEnd);
    writeFileSync(tsPath, patched, 'utf8');
    log(`  bonus-codes.ts patched for ${exchange}`);
    return true;
  }
  return false;
}

function dbg(...a) { VERBOSE && console.log('  ·', ...a); }

// ── Apply proposal ────────────────────────────────────────────────────────────

function applyProposal(proposal) {
  const { exchange, detectedValue, detectedLabel, proposalType } = proposal;
  const today = new Date().toISOString().slice(0, 10);

  log('');
  log(`  Applying proposal for ${exchange} (${proposalType})`);
  log('  ' + '─'.repeat(40));

  if (DRY_RUN) {
    log(`  [DRY-RUN] Would patch:`);
    for (const f of proposal.affectedFiles) log(`    - ${f}`);
    for (const s of proposal.patchSummary) log(`    → ${s}`);
    log('');
    return;
  }

  if (detectedValue) {
    patchExchangesJson(exchange, detectedValue, detectedLabel, today);
    patchAffiliateLinks(exchange, detectedValue, detectedLabel, today);
    patchBonusCodes(exchange, detectedValue, today);
  } else {
    warn(`  No detected value for ${exchange} — updating freshness metadata only`);
    patchExchangesJson(exchange, null, null, today);
  }

  proposal.status       = 'approved';
  proposal.approvedAt   = new Date().toISOString();
  log('');
}

// ── Display helpers ───────────────────────────────────────────────────────────

function printProposalList(proposals) {
  const pending  = proposals.filter(p => p.status === 'pending');
  const approved = proposals.filter(p => p.status === 'approved');
  const rejected = proposals.filter(p => p.status === 'rejected');

  log('');
  log('📋  Bonus Update Proposals');
  log('─'.repeat(60));
  log(`  Total: ${proposals.length}  |  Pending: ${pending.length}  |  Approved: ${approved.length}  |  Rejected: ${rejected.length}`);
  log('');

  if (pending.length === 0) {
    log('  ✅ No pending proposals.');
    log('');
    return;
  }

  log('  Pending:');
  for (const p of pending) {
    const risk = p.riskLevel === 'high' ? '🔴' : p.riskLevel === 'medium' ? '⚠️' : '🟡';
    log(`  ${risk}  ${(p.exchange + '          ').slice(0, 10)}  ${p.proposalType}`);
    log(`         current: ${p.currentValue?.toLocaleString() ?? '—'} USDT  →  detected: ${p.detectedValue?.toLocaleString() ?? '—'} USDT`);
    log(`         approve: npm run bonus:approve -- --exchange ${p.exchange}`);
  }
  log('');
  log('  Approve all pending:');
  log('    npm run bonus:approve -- --approve-all');
  log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const { proposals, generatedAt } = loadProposals();

  if (!proposals.length && !existsSync(PROPOSALS_PATH)) {
    log('');
    log('  No proposals file found. Run first:');
    log('    npm run bonus:verify -- --all --write');
    log('');
    return;
  }

  // ── List ───────────────────────────────────────────────────────────────────
  if (LIST || (!DO_APPROVE && !DO_REJECT)) {
    printProposalList(proposals);
    return;
  }

  // ── Reject ─────────────────────────────────────────────────────────────────
  if (DO_REJECT) {
    const target = proposals.filter(p =>
      p.status === 'pending' && (!EXCHANGE || p.exchange === EXCHANGE)
    );
    if (target.length === 0) {
      log('  No pending proposals found' + (EXCHANGE ? ` for ${EXCHANGE}` : '') + '.');
      return;
    }
    for (const p of target) {
      p.status     = 'rejected';
      p.rejectedAt = new Date().toISOString();
      log(`  Rejected: ${p.exchange}`);
    }
    saveProposals(proposals, generatedAt);
    return;
  }

  // ── Approve ────────────────────────────────────────────────────────────────
  const toApprove = proposals.filter(p =>
    p.status === 'pending' && (APPROVE_ALL || !EXCHANGE || p.exchange === EXCHANGE)
  );

  if (toApprove.length === 0) {
    log(`  No pending proposals${EXCHANGE ? ` for ${EXCHANGE}` : ''}.`);
    if (!DRY_RUN) {
      log('  Run: npm run bonus:proposals to see full list.');
    }
    return;
  }

  log('');
  log(`🔧  Approving ${toApprove.length} proposal(s)${DRY_RUN ? ' [DRY-RUN]' : ''}...`);
  log('─'.repeat(60));

  for (const proposal of toApprove) {
    applyProposal(proposal);
  }

  if (!DRY_RUN) {
    saveProposals(proposals, generatedAt);
    log('  ✅ Proposals applied and marked approved.');
    log('');
    log('  Next steps:');
    log('    npm run build                    # Verify site builds');
    log('    npm run affiliate:audit:strict   # Verify affiliate links');
    log('    git add src/data/ && git commit -m "chore: update bonus data for ...'  );
  }
  log('');
}

main();
