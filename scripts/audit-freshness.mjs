/**
 * audit-freshness.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Checks freshness of all editorial content: reviews, bonuses, screenshots.
 *
 * Reads:
 *   src/data/exchanges.json       — review + bonus dates
 *   src/data/evidence/*.json      — screenshot capturedAt dates
 *
 * Freshness thresholds (mirrors src/utils/freshness.ts):
 *   Review   (lastVerified)       — stale after 30 days  → WARNING
 *   Bonus    (offerLastChecked)   — stale after 7 days   → WARNING (P1 exchanges)
 *   Bonus    (offerLastChecked)   — stale after 14 days  → WARNING (all others)
 *   Screenshot (capturedAt)       — stale after 90 days  → INFO
 *
 * Exit codes:
 *   0 — always (freshness issues are warnings, not CI blockers)
 *
 * Usage:
 *   node scripts/audit-freshness.mjs              # pretty print
 *   node scripts/audit-freshness.mjs --json       # JSON to stdout
 *   node scripts/audit-freshness.mjs --write      # write reports/
 *   node scripts/audit-freshness.mjs --fail-on-issues  # exit 1 if stale items
 *
 * Output files (--write):
 *   reports/freshness-audit.md
 *   reports/freshness-audit.json
 */

import {
  readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const EVIDENCE  = join(ROOT, 'src', 'data', 'evidence');
const REPORTS   = join(ROOT, 'reports');

const args          = process.argv.slice(2);
const WRITE_MODE    = args.includes('--write');
const JSON_MODE     = args.includes('--json');
const FAIL_ON_ISSUES = args.includes('--fail-on-issues');
const VERBOSE       = args.includes('--verbose');

// ── Thresholds ────────────────────────────────────────────────────────────────

const REVIEW_STALE_DAYS     = 30;
const BONUS_STALE_P1_DAYS   = 7;
const BONUS_STALE_OTHER_DAYS = 14;
const SCREENSHOT_STALE_DAYS = 90;

// Exchange priority bands (P1 = most critical freshness requirement)
const PRIORITY_RANK = {
  binance: 1, okx: 2, mexc: 3, bitget: 4, coinbase: 5, bingx: 6,
  bybit: 7, 'gate-io': 8, kucoin: 9, htx: 10,
  coinex: 11, phemex: 12, bitunix: 13, lbank: 14,
};

function getPriority(slug) {
  const rank = PRIORITY_RANK[slug] ?? 99;
  return rank <= 3 ? 'P1' : rank <= 6 ? 'P2' : rank <= 10 ? 'P3' : 'P4';
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function ageDays(dateStr) {
  if (!dateStr) return Infinity;
  const normalized = String(dateStr).length === 7 ? dateStr + '-01' : dateStr;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatAge(days) {
  if (!isFinite(days)) return 'unknown date';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const normalized = String(dateStr).length === 7 ? dateStr + '-01' : dateStr;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return dateStr;
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Load data ─────────────────────────────────────────────────────────────────

function loadExchanges() {
  const path = join(ROOT, 'src', 'data', 'exchanges.json');
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadEvidenceFiles() {
  if (!existsSync(EVIDENCE)) return {};
  const files = readdirSync(EVIDENCE).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const registry = {};
  for (const f of files) {
    try {
      const ev = JSON.parse(readFileSync(join(EVIDENCE, f), 'utf8'));
      if (ev.exchange) registry[ev.exchange] = ev;
    } catch { /* skip malformed */ }
  }
  return registry;
}

// ── Check each exchange ───────────────────────────────────────────────────────

function checkExchange(ex, evidenceRegistry) {
  const slug     = ex.slug;
  const priority = getPriority(slug);
  const ev       = evidenceRegistry[slug] ?? null;

  const issues = [];

  // — Review freshness —
  const reviewDate  = ex.lastVerified ?? ex.updatedAt;
  const reviewAge   = ageDays(reviewDate);
  const reviewStale = reviewAge > REVIEW_STALE_DAYS;
  if (reviewStale) {
    issues.push({
      type: 'review',
      severity: 'warning',
      slug,
      priority,
      field:   'lastVerified',
      date:    reviewDate ?? null,
      ageDays: reviewAge,
      message: `Review stale: last verified ${formatAge(reviewAge)} (${formatDate(reviewDate)}) — threshold ${REVIEW_STALE_DAYS}d`,
    });
  }

  // — Bonus freshness —
  const bonusDate  = ex.offerLastChecked ?? ex.lastVerified ?? ex.updatedAt;
  const bonusAge   = ageDays(bonusDate);
  const bonusThreshold = priority === 'P1' ? BONUS_STALE_P1_DAYS : BONUS_STALE_OTHER_DAYS;
  const bonusStale = bonusAge > bonusThreshold;
  if (bonusStale) {
    issues.push({
      type: 'bonus',
      severity: 'warning',
      slug,
      priority,
      field:   'offerLastChecked',
      date:    bonusDate ?? null,
      ageDays: bonusAge,
      message: `Bonus stale: last checked ${formatAge(bonusAge)} (${formatDate(bonusDate)}) — threshold ${bonusThreshold}d (${priority})`,
    });
  }

  // — Screenshot freshness —
  if (ev?.screenshots) {
    for (const [cat, entry] of Object.entries(ev.screenshots)) {
      if (!entry || entry.status !== 'available' || !entry.capturedAt) continue;
      const ssAge   = ageDays(entry.capturedAt);
      const ssStale = ssAge > SCREENSHOT_STALE_DAYS;
      if (ssStale) {
        issues.push({
          type: 'screenshot',
          severity: 'info',
          slug,
          priority,
          field:    cat,
          date:     entry.capturedAt,
          ageDays:  ssAge,
          message:  `Screenshot stale: ${cat} captured ${formatAge(ssAge)} (${formatDate(entry.capturedAt)}) — threshold ${SCREENSHOT_STALE_DAYS}d`,
        });
      }
    }
  }

  // — Evidence facts freshness —
  if (ev?.facts) {
    for (const fact of ev.facts) {
      if (fact.conflictStatus === 'outdated' || fact.conflictStatus === 'conflict') {
        issues.push({
          type: 'fact',
          severity: 'warning',
          slug,
          priority,
          field:   fact.field,
          date:    fact.lastChecked ?? null,
          ageDays: ageDays(fact.lastChecked),
          message: `Evidence fact "${fact.field}" has conflict/outdated status: ${fact.conflictStatus}`,
        });
      }
    }
  }

  return {
    slug,
    priority,
    reviewDate:  reviewDate ?? null,
    reviewAge,
    reviewStale,
    bonusDate:   bonusDate ?? null,
    bonusAge,
    bonusStale,
    issues,
  };
}

// ── Coverage stats ────────────────────────────────────────────────────────────

function calcStats(exchangeResults) {
  return {
    total:          exchangeResults.length,
    reviewFresh:    exchangeResults.filter(r => !r.reviewStale).length,
    reviewStale:    exchangeResults.filter(r => r.reviewStale).length,
    bonusFresh:     exchangeResults.filter(r => !r.bonusStale).length,
    bonusStale:     exchangeResults.filter(r => r.bonusStale).length,
    totalIssues:    exchangeResults.reduce((s, r) => s + r.issues.length, 0),
    warnings:       exchangeResults.reduce((s, r) => s + r.issues.filter(i => i.severity === 'warning').length, 0),
    infos:          exchangeResults.reduce((s, r) => s + r.issues.filter(i => i.severity === 'info').length, 0),
  };
}

// ── Report builders ───────────────────────────────────────────────────────────

const NOW = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

function buildMarkdown({ exchangeResults, stats }) {
  const lines = [];

  lines.push('# Freshness Audit Report');
  lines.push(`*Generated: ${NOW}*`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Exchanges checked | ${stats.total} |`);
  lines.push(`| Reviews fresh (≤30d) | ${stats.reviewFresh} |`);
  lines.push(`| Reviews stale | ${stats.reviewStale} |`);
  lines.push(`| Bonuses fresh | ${stats.bonusFresh} |`);
  lines.push(`| Bonuses stale | ${stats.bonusStale} |`);
  lines.push(`| Total issues | ${stats.totalIssues} |`);
  lines.push(`| Warnings | ${stats.warnings} |`);
  lines.push(`| Info | ${stats.infos} |`);
  lines.push('');

  // Per-exchange table
  lines.push('## Per-Exchange Freshness');
  lines.push('');
  lines.push('| Priority | Exchange | Review Date | Review Age | Bonus Date | Bonus Age | Issues |');
  lines.push('|----------|----------|------------|------------|------------|-----------|--------|');
  for (const r of exchangeResults.sort((a, b) => (PRIORITY_RANK[a.slug] ?? 99) - (PRIORITY_RANK[b.slug] ?? 99))) {
    const rAge  = isFinite(r.reviewAge) ? formatAge(r.reviewAge) : '?';
    const bAge  = isFinite(r.bonusAge)  ? formatAge(r.bonusAge)  : '?';
    const rIcon = r.reviewStale ? '🔴' : '✅';
    const bIcon = r.bonusStale  ? '🔴' : '✅';
    lines.push(`| ${r.priority} | ${r.slug} | ${formatDate(r.reviewDate)} | ${rIcon} ${rAge} | ${formatDate(r.bonusDate)} | ${bIcon} ${bAge} | ${r.issues.length} |`);
  }
  lines.push('');

  // Stale reviews
  const staleReviews = exchangeResults.filter(r => r.reviewStale);
  if (staleReviews.length > 0) {
    lines.push(`## Stale Reviews (${staleReviews.length})`);
    lines.push('');
    for (const r of staleReviews) {
      lines.push(`- **${r.slug}** (${r.priority}): last verified ${formatDate(r.reviewDate)} — ${formatAge(r.reviewAge)} ago`);
    }
    lines.push('');
  }

  // Stale bonuses
  const staleBonuses = exchangeResults.filter(r => r.bonusStale);
  if (staleBonuses.length > 0) {
    lines.push(`## Stale Bonus Data (${staleBonuses.length})`);
    lines.push('');
    for (const r of staleBonuses) {
      lines.push(`- **${r.slug}** (${r.priority}): bonus last checked ${formatDate(r.bonusDate)} — ${formatAge(r.bonusAge)} ago`);
    }
    lines.push('');
  }

  // All issues
  const allIssues = exchangeResults.flatMap(r => r.issues);
  const warnings  = allIssues.filter(i => i.severity === 'warning');
  if (warnings.length > 0) {
    lines.push(`## All Warnings (${warnings.length})`);
    lines.push('');
    for (const w of warnings) {
      lines.push(`- [${w.priority}] **${w.slug}** / ${w.type}: ${w.message}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Thresholds: Reviews 30d · Bonus P1 7d / others 14d · Screenshots 90d*');
  lines.push('*Run `npm run freshness:audit` to regenerate.*');

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const exchanges = loadExchanges();
  const evidence  = loadEvidenceFiles();

  if (exchanges.length === 0) {
    console.error('ERROR: exchanges.json not found or empty.');
    process.exit(1);
  }

  const exchangeResults = exchanges.map(ex => checkExchange(ex, evidence));
  const stats = calcStats(exchangeResults);

  const allIssues  = exchangeResults.flatMap(r => r.issues);
  const warnings   = allIssues.filter(i => i.severity === 'warning');
  const infos      = allIssues.filter(i => i.severity === 'info');

  const jsonReport = {
    generatedAt: NOW,
    stats,
    thresholds: {
      reviewStaleDays:        REVIEW_STALE_DAYS,
      bonusStaleP1Days:       BONUS_STALE_P1_DAYS,
      bonusStaleOtherDays:    BONUS_STALE_OTHER_DAYS,
      screenshotStaleDays:    SCREENSHOT_STALE_DAYS,
    },
    exchanges: exchangeResults.map(r => ({
      slug:        r.slug,
      priority:    r.priority,
      reviewDate:  r.reviewDate,
      reviewAge:   isFinite(r.reviewAge) ? r.reviewAge : null,
      reviewStale: r.reviewStale,
      bonusDate:   r.bonusDate,
      bonusAge:    isFinite(r.bonusAge) ? r.bonusAge : null,
      bonusStale:  r.bonusStale,
      issues:      r.issues,
    })),
    warnings,
    infos,
  };

  if (JSON_MODE && !WRITE_MODE) {
    console.log(JSON.stringify(jsonReport, null, 2));
    process.exit(FAIL_ON_ISSUES && (warnings.length > 0) ? 1 : 0);
    return;
  }

  if (WRITE_MODE) {
    if (!existsSync(REPORTS)) mkdirSync(REPORTS, { recursive: true });
    const md   = join(REPORTS, 'freshness-audit.md');
    const json = join(REPORTS, 'freshness-audit.json');
    writeFileSync(md,   buildMarkdown({ exchangeResults, stats }), 'utf8');
    writeFileSync(json, JSON.stringify(jsonReport, null, 2), 'utf8');
    console.log('Written: reports/freshness-audit.md');
    console.log('Written: reports/freshness-audit.json');
  }

  // Console summary
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Freshness Audit');
  console.log(`  ${NOW}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Exchanges checked : ${stats.total}`);
  console.log(`  Reviews fresh     : ${stats.reviewFresh}   stale: ${stats.reviewStale}   (threshold: ${REVIEW_STALE_DAYS}d)`);
  console.log(`  Bonuses fresh     : ${stats.bonusFresh}   stale: ${stats.bonusStale}   (P1: ${BONUS_STALE_P1_DAYS}d / others: ${BONUS_STALE_OTHER_DAYS}d)`);
  console.log(`  Warnings          : ${stats.warnings}`);
  console.log(`  Info (screenshots): ${stats.infos}`);
  console.log('────────────────────────────────────────────────────────────');

  if (warnings.length > 0 || VERBOSE) {
    // Show top-priority stale items
    const sorted = [...warnings].sort((a, b) => {
      const pa = PRIORITY_RANK[a.slug] ?? 99;
      const pb = PRIORITY_RANK[b.slug] ?? 99;
      return pa - pb || b.ageDays - a.ageDays;
    });
    console.log('  Top stale items (by priority):');
    for (const w of sorted.slice(0, 10)) {
      console.log(`    ${w.priority}  ${w.slug.padEnd(12)} ${w.type.padEnd(10)} ${formatAge(w.ageDays).padEnd(10)} ${formatDate(w.date)}`);
    }
    if (sorted.length > 10) console.log(`    … and ${sorted.length - 10} more`);
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  if (FAIL_ON_ISSUES && warnings.length > 0) {
    console.error(`FAIL: ${warnings.length} freshness warning(s) found.`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Freshness audit failed:', err);
  process.exit(1);
});
