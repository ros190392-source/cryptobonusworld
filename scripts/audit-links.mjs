#!/usr/bin/env node
/**
 * audit-links.mjs — CryptoBonusWorld Affiliate Link Health Audit
 *
 * Usage:
 *   npm run audit:links          — colored table summary
 *   npm run audit:links -- --json — machine-readable JSON
 *   npm run audit:links -- --fail-on-missing — exit 1 if any real URL missing
 *
 * Checks:
 *   1. affiliateUrl — placeholder (#)
 *   2. affiliateLinks.default — placeholder / missing
 *   3. affiliateLinks.geo.{tr,in,id,ng,br,vn,ph} — each geo URL
 *   4. Malformed URLs (non-HTTP/HTTPS)
 *   5. Duplicate URLs across exchanges (same URL used for different exchanges)
 *
 * Exit codes:
 *   0 — all URLs real and valid
 *   1 — at least one missing/placeholder URL (with --fail-on-missing)
 *   0 — by default even with placeholders (development-friendly)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const exchangesPath = join(__dirname, '../src/data/exchanges.json');

const SUPPORTED_GEOS = ['tr', 'in', 'id', 'ng', 'br', 'vn', 'ph'];
const PLACEHOLDER     = '#';

// ── Args ─────────────────────────────────────────────────────────────────────
const args           = process.argv.slice(2);
const asJson         = args.includes('--json');
const failOnMissing  = args.includes('--fail-on-missing');

// ── Load data ─────────────────────────────────────────────────────────────────
const exchanges = JSON.parse(readFileSync(exchangesPath, 'utf8'));

// ── Helpers ───────────────────────────────────────────────────────────────────
const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

function isPlaceholder(url) {
  return !url || url.trim() === '' || url.trim() === PLACEHOLDER || url === 'null';
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
}

// ── Audit ─────────────────────────────────────────────────────────────────────
const seenUrls = new Map(); // url → exchange slug (duplicate detection)
const issues   = [];
const summary  = {
  total:        exchanges.length,
  healthyExchanges: 0,
  issueCount:   0,
  byType: {
    placeholder: 0,
    missing:     0,
    malformed:   0,
    duplicate:   0,
  },
  byExchange: {},
};

function addIssue(exchange, field, type, value) {
  const entry = { exchange, field, type, value: value ?? null };
  issues.push(entry);
  summary.issueCount++;
  summary.byType[type] = (summary.byType[type] || 0) + 1;
  if (!summary.byExchange[exchange]) summary.byExchange[exchange] = [];
  summary.byExchange[exchange].push(entry);
}

for (const ex of exchanges) {
  const slug = ex.slug;

  // ── affiliateUrl ────────────────────────────────────────────────────────────
  if (isPlaceholder(ex.affiliateUrl)) {
    addIssue(slug, 'affiliateUrl', 'placeholder', ex.affiliateUrl);
  } else if (!isValidUrl(ex.affiliateUrl)) {
    addIssue(slug, 'affiliateUrl', 'malformed', ex.affiliateUrl);
  } else {
    const prior = seenUrls.get(ex.affiliateUrl);
    if (prior) {
      addIssue(slug, 'affiliateUrl', 'duplicate', `same as ${prior}`);
    } else {
      seenUrls.set(ex.affiliateUrl, slug);
    }
  }

  // ── affiliateLinks.default ──────────────────────────────────────────────────
  const defUrl = ex.affiliateLinks?.default;
  if (!defUrl) {
    addIssue(slug, 'affiliateLinks.default', 'missing', null);
  } else if (isPlaceholder(defUrl)) {
    addIssue(slug, 'affiliateLinks.default', 'placeholder', defUrl);
  } else if (!isValidUrl(defUrl)) {
    addIssue(slug, 'affiliateLinks.default', 'malformed', defUrl);
  }

  // ── geo URLs ────────────────────────────────────────────────────────────────
  for (const geo of SUPPORTED_GEOS) {
    const geoUrl = ex.affiliateLinks?.geo?.[geo];
    if (!geoUrl) {
      addIssue(slug, `geo.${geo}`, 'missing', null);
    } else if (isPlaceholder(geoUrl)) {
      addIssue(slug, `geo.${geo}`, 'placeholder', geoUrl);
    } else if (!isValidUrl(geoUrl)) {
      addIssue(slug, `geo.${geo}`, 'malformed', geoUrl);
    }
  }
}

// Count healthy exchanges
for (const ex of exchanges) {
  if (!summary.byExchange[ex.slug]) summary.healthyExchanges++;
}

// ── Output ────────────────────────────────────────────────────────────────────
if (asJson) {
  console.log(JSON.stringify({ summary, issues }, null, 2));
  process.exit(failOnMissing && summary.issueCount > 0 ? 1 : 0);
}

// ── Colored table output ──────────────────────────────────────────────────────
console.log('\n' + BOLD + CYAN + '  CryptoBonusWorld — Affiliate Link Health Audit' + RESET);
console.log(DIM + '  ' + new Date().toISOString() + RESET + '\n');

// Per-exchange summary
const colW = [14, 26, 14, 40];
const header = [
  'Exchange'.padEnd(colW[0]),
  'Field'.padEnd(colW[1]),
  'Issue'.padEnd(colW[2]),
  'Value',
].join('  ');
console.log(BOLD + '  ' + header + RESET);
console.log('  ' + '─'.repeat(colW.reduce((a, b) => a + b + 2, 0)));

if (issues.length === 0) {
  console.log(GREEN + '\n  ✓ All affiliate URLs are real and valid.\n' + RESET);
} else {
  const typeColor = { placeholder: YELLOW, missing: RED, malformed: RED, duplicate: YELLOW };

  for (const iss of issues) {
    const color = typeColor[iss.type] || RESET;
    const row = [
      iss.exchange.padEnd(colW[0]),
      iss.field.padEnd(colW[1]),
      (color + iss.type + RESET).padEnd(colW[2] + color.length + RESET.length),
      DIM + (iss.value ?? '—') + RESET,
    ].join('  ');
    console.log('  ' + row);
  }
}

// Footer summary
console.log('\n' + BOLD + '  Summary' + RESET);
console.log(`  Total exchanges:   ${summary.total}`);
console.log(`  Healthy:           ${GREEN}${summary.healthyExchanges}${RESET}`);
console.log(`  With issues:       ${summary.total - summary.healthyExchanges}`);
console.log(`  Total issues:      ${summary.issueCount}`);
console.log(`    · Placeholder:   ${YELLOW}${summary.byType.placeholder || 0}${RESET}`);
console.log(`    · Missing:       ${RED}${summary.byType.missing || 0}${RESET}`);
console.log(`    · Malformed:     ${RED}${summary.byType.malformed || 0}${RESET}`);
console.log(`    · Duplicate:     ${YELLOW}${summary.byType.duplicate || 0}${RESET}`);

if (summary.issueCount > 0) {
  console.log('\n' + YELLOW + '  Action required: Fill real affiliate URLs in src/data/exchanges.json' + RESET);
  console.log(DIM + '  Each exchange needs: affiliateLinks.default + affiliateLinks.geo.{tr,in,id,ng,br,vn,ph}' + RESET);
}

console.log('');

process.exit(failOnMissing && summary.issueCount > 0 ? 1 : 0);
