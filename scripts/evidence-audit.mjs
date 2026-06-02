#!/usr/bin/env node
/**
 * CryptoBonusWorld — Evidence Audit Script
 *
 * Usage:
 *   node scripts/evidence-audit.mjs
 *   node scripts/evidence-audit.mjs --exchange bybit
 *   node scripts/evidence-audit.mjs --stale-only
 *   node scripts/evidence-audit.mjs --json
 *
 * Options:
 *   --exchange <slug>   Audit a single exchange
 *   --stale-only        Only show stale facts
 *   --needs-review      Only show facts needing manual review
 *   --json              Output JSON for CI/dashboard consumption
 *   --verbose           Show all facts, not just issues
 *   --help              Show this help
 *
 * Exit codes:
 *   0 — No critical issues
 *   1 — Has errors (conflicts, missing critical fields)
 *   2 — Has warnings only (stale facts, low confidence)
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT         = join(__dirname, '..');
const EVIDENCE_DIR = join(ROOT, 'src', 'data', 'evidence');
const PUBLIC_DIR   = join(ROOT, 'public');

// ── CLI argument parsing ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {
  exchange:   args[args.indexOf('--exchange') + 1] || null,
  staleOnly:  args.includes('--stale-only'),
  needsReview:args.includes('--needs-review'),
  json:       args.includes('--json'),
  verbose:    args.includes('--verbose'),
  help:       args.includes('--help'),
};

if (flags.help) {
  console.log(`
Evidence Audit — CryptoBonusWorld

Usage:
  node scripts/evidence-audit.mjs [options]

Options:
  --exchange <slug>   Audit a single exchange
  --stale-only        Only show stale facts
  --needs-review      Only show facts requiring manual review
  --json              Output JSON (for CI/dashboards)
  --verbose           Show all facts (not just issues)
  --help              Show this help

Exit codes:
  0 — No critical issues
  1 — Has errors (conflicts, missing critical fields)
  2 — Has warnings only (stale / low confidence)
`);
  process.exit(0);
}

// ── Load evidence files ───────────────────────────────────────────────────────

function loadEvidenceFiles() {
  const files = readdirSync(EVIDENCE_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'));

  return files.map(f => {
    try {
      const raw = readFileSync(join(EVIDENCE_DIR, f), 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Failed to parse ${f}: ${e.message}`);
      return null;
    }
  }).filter(Boolean);
}

// ── Engine logic (mirrors evidenceEngine.ts in plain JS) ─────────────────────

const CHECK_SCHEDULE = {
  bonus_amount:            { maxAgeDays: 1 },
  bonus_currency:          { maxAgeDays: 7 },
  bonus_expiry_days:       { maxAgeDays: 1 },
  bonus_requires_kyc:      { maxAgeDays: 7 },
  bonus_requires_deposit:  { maxAgeDays: 7 },
  bonus_min_deposit:       { maxAgeDays: 7 },
  bonus_promo_code:        { maxAgeDays: 7 },
  spot_maker_fee:          { maxAgeDays: 7 },
  spot_taker_fee:          { maxAgeDays: 7 },
  futures_maker_fee:       { maxAgeDays: 7 },
  futures_taker_fee:       { maxAgeDays: 7 },
  max_futures_leverage:    { maxAgeDays: 30 },
  kyc_required:            { maxAgeDays: 7 },
  no_kyc_withdrawal_limit: { maxAgeDays: 7 },
  kyc_levels_count:        { maxAgeDays: 30 },
  p2p_available:           { maxAgeDays: 7 },
  futures_available:       { maxAgeDays: 30 },
  copy_trading:            { maxAgeDays: 30 },
  staking_available:       { maxAgeDays: 30 },
  proof_of_reserves:       { maxAgeDays: 30 },
  licences:                { maxAgeDays: 90 },
  headquarters:            { maxAgeDays: 90 },
  founded_year:            { maxAgeDays: 365 },
  restricted_us:           { maxAgeDays: 7 },
  restricted_eu:           { maxAgeDays: 7 },
  fiat_deposit_methods:    { maxAgeDays: 7 },
  min_deposit_usd:         { maxAgeDays: 7 },
  trading_pairs_count:     { maxAgeDays: 30 },
  mobile_app_ios:          { maxAgeDays: 30 },
  mobile_app_android:      { maxAgeDays: 30 },
};

const SOURCE_QUALITY = {
  'official-promo':    0.90,
  'official-fees':     0.95,
  'official-kyc':      0.95,
  'official-legal':    0.95,
  'official-reserves': 0.95,
  'official-p2p':      0.90,
  'official-app':      0.85,
  'official-blog':     0.85,
  'official-help':     0.90,
  'official-affiliate':0.85,
  'official-other':    0.80,
  'secondary-news':    0.65,
  'secondary-review':  0.55,
  'secondary-reddit':  0.35,
  'internal-test':     0.80,
};

function factAgeDays(fact) {
  const d = fact.lastChecked;
  const checked = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  return (Date.now() - checked.getTime()) / (1000 * 60 * 60 * 24);
}

function isStale(fact) {
  const schedule = CHECK_SCHEDULE[fact.field];
  if (!schedule) return false;
  return factAgeDays(fact) > schedule.maxAgeDays;
}

function recencyMultiplier(lastChecked, fieldName) {
  const schedule = CHECK_SCHEDULE[fieldName];
  const maxAge = schedule?.maxAgeDays ?? 30;
  const d = lastChecked;
  const checked = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  const ageDays = (Date.now() - checked.getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays <= maxAge * 0.25)  return 1.0;
  if (ageDays <= maxAge * 0.5)   return 0.95;
  if (ageDays <= maxAge * 0.75)  return 0.88;
  if (ageDays <= maxAge * 1.0)   return 0.80;
  if (ageDays <= maxAge * 1.5)   return 0.65;
  if (ageDays <= maxAge * 3.0)   return 0.50;
  return 0.30;
}

function calculateConfidence(fact, ev) {
  const sources = ev.sources;
  const sourceKey = fact.officialSourceKey;

  let sourceQuality = 0.70;
  if (sourceKey && sources[sourceKey]) {
    sourceQuality = SOURCE_QUALITY[sources[sourceKey].type] ?? 0.70;
  } else if (fact.officialSourceUrl) {
    sourceQuality = 0.80;
  }
  if (!sourceKey && !fact.officialSourceUrl) {
    sourceQuality = 0.35;
  }

  const secondaryBonus = fact.secondarySourceUrl ? 0.05 : 0;
  const quality = Math.min(1.0, sourceQuality + secondaryBonus);
  const recency = recencyMultiplier(fact.lastChecked, fact.field);
  return Math.round(quality * recency * 100) / 100;
}

function resolveConflictStatus(fact) {
  if (fact.conflictStatus === 'conflict') return 'conflict';
  if (fact.conflictStatus === 'unverified') return 'unverified';
  if (fact.conflictStatus === 'needs-check') return 'needs-check';
  if (isStale(fact)) return 'outdated';
  return 'ok';
}

const CRITICAL_FIELDS = ['bonus_amount', 'kyc_required', 'spot_maker_fee', 'spot_taker_fee', 'p2p_available', 'restricted_us'];

const SCREENSHOT_CATEGORIES = ['registration', 'kyc', 'bonus', 'deposit', 'p2p', 'spot', 'futures', 'fees', 'mobile_app', 'proof_of_reserves'];
const VALID_SCREENSHOT_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg']);
const SCREENSHOT_MAX_AGE_DAYS = 90;

// ── Screenshot audit ──────────────────────────────────────────────────────────

function auditScreenshots(ev) {
  const issues = [];
  const screenshots = ev.screenshots ?? {};

  // Check that all known categories are present in the registry
  for (const cat of SCREENSHOT_CATEGORIES) {
    if (!(cat in screenshots)) {
      issues.push({ severity: 'warn', field: `screenshots.${cat}`, message: 'Category missing from registry — add entry with appropriate status' });
    }
  }

  let availableCount = 0;
  let pendingCount = 0;
  let notApplicableCount = 0;

  for (const [cat, entry] of Object.entries(screenshots)) {
    if (!entry) continue;
    const { status, path, capturedAt } = entry;

    if (status === 'not_applicable') { notApplicableCount++; continue; }
    if (status === 'available') { availableCount++; }
    else { pendingCount++; }

    if (status === 'available') {
      if (!path) {
        issues.push({ severity: 'error', field: `screenshots.${cat}`, message: 'status=available but path is null — set path or revert to needs_manual_capture' });
      } else {
        const ext = extname(path).toLowerCase();
        if (!VALID_SCREENSHOT_EXTENSIONS.has(ext)) {
          issues.push({ severity: 'error', field: `screenshots.${cat}`, message: `Invalid extension "${ext}" — must be .webp, .png, or .jpg` });
        }
        if (!capturedAt) {
          issues.push({ severity: 'warn', field: `screenshots.${cat}`, message: 'status=available but capturedAt is null — add YYYY-MM capture date' });
        } else {
          if (!/^\d{4}-\d{2}$/.test(capturedAt)) {
            issues.push({ severity: 'error', field: `screenshots.${cat}`, message: `capturedAt "${capturedAt}" is not YYYY-MM format` });
          } else {
            const ageDays = (Date.now() - new Date(capturedAt + '-01').getTime()) / (1000 * 60 * 60 * 24);
            if (ageDays > SCREENSHOT_MAX_AGE_DAYS) {
              issues.push({ severity: 'warn', field: `screenshots.${cat}`, message: `Screenshot stale (${Math.round(ageDays)}d old, max ${SCREENSHOT_MAX_AGE_DAYS}d) — recapture` });
            }
          }
        }
      }
    }
  }

  return { issues, availableCount, pendingCount, notApplicableCount };
}

// ── Audit logic ───────────────────────────────────────────────────────────────

function auditExchange(ev) {
  const facts = ev.facts;
  const issues = [];
  let errorCount = 0;
  let warnCount = 0;

  const presentFields = new Set(facts.map(f => f.field));
  const missingCritical = CRITICAL_FIELDS.filter(f => !presentFields.has(f));

  if (missingCritical.length > 0) {
    issues.push({ severity: 'error', message: `Missing critical fields: ${missingCritical.join(', ')}` });
    errorCount++;
  }

  for (const fact of facts) {
    const conf    = calculateConfidence(fact, ev);
    const status  = resolveConflictStatus(fact);
    const ageDays = factAgeDays(fact);

    if (status === 'conflict') {
      issues.push({ severity: 'error', field: fact.field, message: `Source conflict — manual review required`, conf, ageDays: Math.round(ageDays) });
      errorCount++;
    } else if (fact.manualReviewRequired) {
      issues.push({ severity: 'warn', field: fact.field, message: `Flagged for manual review`, conf, ageDays: Math.round(ageDays) });
      warnCount++;
    } else if (status === 'outdated') {
      const schedule = CHECK_SCHEDULE[fact.field];
      const maxAge = schedule?.maxAgeDays ?? '?';
      issues.push({ severity: 'warn', field: fact.field, message: `Stale (${Math.round(ageDays)}d old, max ${maxAge}d)`, conf, ageDays: Math.round(ageDays) });
      warnCount++;
    } else if (status === 'unverified') {
      issues.push({ severity: 'warn', field: fact.field, message: `Unverified — no confirmed source`, conf, ageDays: Math.round(ageDays) });
      warnCount++;
    } else if (conf < 0.55) {
      issues.push({ severity: 'warn', field: fact.field, message: `Low confidence (${Math.round(conf * 100)}%)`, conf, ageDays: Math.round(ageDays) });
      warnCount++;
    } else if (flags.verbose) {
      issues.push({ severity: 'ok', field: fact.field, message: `OK (${Math.round(conf * 100)}%)`, conf, ageDays: Math.round(ageDays) });
    }
  }

  // Average confidence
  const avgConf = facts.length > 0
    ? facts.reduce((sum, f) => sum + calculateConfidence(f, ev), 0) / facts.length
    : 0;

  // Screenshot audit
  const ssAudit = auditScreenshots(ev);
  for (const issue of ssAudit.issues) {
    if (issue.severity === 'error') { issues.push(issue); errorCount++; }
    else if (flags.verbose || issue.severity === 'error') { issues.push(issue); warnCount++; }
  }

  return {
    exchange: ev.exchange,
    totalFacts: facts.length,
    missingCritical,
    errorCount,
    warnCount,
    avgConf: Math.round(avgConf * 100),
    issues,
    updatedAt: ev.updatedAt,
    screenshots: {
      available:      ssAudit.availableCount,
      pending:        ssAudit.pendingCount,
      notApplicable:  ssAudit.notApplicableCount,
    },
  };
}

// ── Output formatters ─────────────────────────────────────────────────────────

const RESET   = '\x1b[0m';
const RED     = '\x1b[31m';
const YELLOW  = '\x1b[33m';
const GREEN   = '\x1b[32m';
const CYAN    = '\x1b[36m';
const BOLD    = '\x1b[1m';
const DIM     = '\x1b[2m';

function severityColor(s) {
  return s === 'error' ? RED : s === 'warn' ? YELLOW : s === 'ok' ? GREEN : RESET;
}
function severityIcon(s) {
  return s === 'error' ? '❌' : s === 'warn' ? '⚠️' : s === 'ok' ? '✅' : 'ℹ️';
}

function printExchangeReport(result) {
  const statusColor = result.errorCount > 0 ? RED : result.warnCount > 0 ? YELLOW : GREEN;
  const statusIcon  = result.errorCount > 0 ? '❌' : result.warnCount > 0 ? '⚠️' : '✅';

  console.log(`\n${BOLD}${statusIcon}  ${result.exchange.toUpperCase()}${RESET}  ${DIM}(${result.totalFacts} facts, avg conf ${result.avgConf}%, updated ${result.updatedAt})${RESET}`);

  if (result.issues.length === 0) {
    console.log(`  ${GREEN}No issues found${RESET}`);
    return;
  }

  for (const issue of result.issues) {
    if (flags.staleOnly && issue.severity !== 'warn') continue;
    if (flags.needsReview && !issue.message.includes('manual review')) continue;

    const col  = severityColor(issue.severity);
    const icon = severityIcon(issue.severity);
    const fieldPart = issue.field ? `${CYAN}${issue.field}${RESET}` : '';
    const agePart   = issue.ageDays != null ? `${DIM}(${issue.ageDays}d old)${RESET}` : '';

    console.log(`  ${icon} ${fieldPart} ${col}${issue.message}${RESET} ${agePart}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const allEvidence = loadEvidenceFiles();

  let toAudit = allEvidence;
  if (flags.exchange) {
    toAudit = allEvidence.filter(ev => ev.exchange === flags.exchange);
    if (toAudit.length === 0) {
      console.error(`No evidence file found for exchange: ${flags.exchange}`);
      console.error(`Available: ${allEvidence.map(e => e.exchange).join(', ')}`);
      process.exit(1);
    }
  }

  const results = toAudit.map(auditExchange);

  // JSON output mode
  if (flags.json) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.some(r => r.errorCount > 0) ? 1 : results.some(r => r.warnCount > 0) ? 2 : 0);
  }

  // Summary header
  const totalErrors   = results.reduce((s, r) => s + r.errorCount, 0);
  const totalWarnings = results.reduce((s, r) => s + r.warnCount, 0);
  const totalFacts    = results.reduce((s, r) => s + r.totalFacts, 0);
  const ssAvailable   = results.reduce((s, r) => s + (r.screenshots?.available ?? 0), 0);
  const ssPending     = results.reduce((s, r) => s + (r.screenshots?.pending   ?? 0), 0);
  const ssNA          = results.reduce((s, r) => s + (r.screenshots?.notApplicable ?? 0), 0);
  const ssApplicable  = ssAvailable + ssPending;
  const ssCoverage    = ssApplicable > 0 ? Math.round(ssAvailable / ssApplicable * 100) : 100;

  console.log(`\n${BOLD}═══════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  CryptoBonusWorld — Evidence Audit Report${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════${RESET}`);
  console.log(`  Exchanges: ${results.length}  ·  Facts: ${totalFacts}`);
  console.log(`  ${RED}Errors: ${totalErrors}${RESET}  ·  ${YELLOW}Warnings: ${totalWarnings}${RESET}`);
  console.log(`  Screenshots: ${GREEN}${ssAvailable} available${RESET}  ·  ${YELLOW}${ssPending} pending${RESET}  ·  ${DIM}${ssNA} N/A${RESET}  (${ssCoverage}% coverage)`);
  console.log(`  Generated: ${new Date().toISOString()}`);

  // Per-exchange reports
  for (const result of results) {
    printExchangeReport(result);
  }

  // Prioritised action list
  const allIssues = results.flatMap(r =>
    r.issues
      .filter(i => i.severity !== 'ok')
      .map(i => ({ exchange: r.exchange, ...i }))
  );

  const critical = allIssues.filter(i => i.severity === 'error');
  const stale    = allIssues.filter(i => i.severity === 'warn' && i.message.includes('Stale'));
  const other    = allIssues.filter(i => i.severity === 'warn' && !i.message.includes('Stale'));

  if (critical.length > 0) {
    console.log(`\n${BOLD}${RED}── Critical Issues (fix now) ───────────────${RESET}`);
    for (const issue of critical.slice(0, 10)) {
      console.log(`  ${RED}❌ ${issue.exchange} / ${issue.field ?? 'n/a'}:${RESET} ${issue.message}`);
    }
  }

  if (stale.length > 0) {
    console.log(`\n${BOLD}${YELLOW}── Stale Facts (re-verify) ─────────────────${RESET}`);
    const sorted = stale.sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0));
    for (const issue of sorted.slice(0, 15)) {
      console.log(`  ${YELLOW}⟳ ${issue.exchange} / ${issue.field}${RESET}  ${DIM}${issue.message}${RESET}`);
    }
    if (stale.length > 15) {
      console.log(`  ${DIM}… and ${stale.length - 15} more${RESET}`);
    }
  }

  if (other.length > 0) {
    console.log(`\n${BOLD}── Other Warnings ──────────────────────────${RESET}`);
    for (const issue of other.slice(0, 10)) {
      console.log(`  ${YELLOW}⚠️  ${issue.exchange} / ${issue.field ?? 'n/a'}:${RESET} ${issue.message}`);
    }
  }

  console.log(`\n${DIM}Run with --help for usage options${RESET}\n`);

  // Exit code
  process.exit(totalErrors > 0 ? 1 : totalWarnings > 0 ? 2 : 0);
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
