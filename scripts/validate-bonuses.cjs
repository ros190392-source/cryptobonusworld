#!/usr/bin/env node
/**
 * CryptoBonusWorld — Bonus Validation Script
 * ===========================================
 *
 * Run:  node scripts/validate-bonuses.cjs
 *
 * Checks:
 *  1. Stale offers (offerLastChecked > 30 days)
 *  2. Missing verification status / sources
 *  3. Risky/misleading wording in text fields
 *  4. Inconsistent bonus amounts (bonus > bonusRange.max)
 *  5. Campaign-mode offers without recent check
 *  6. Summary integrity (all Quick Summary slugs exist in exchanges.json)
 *
 * Exit code 0 = all clear
 * Exit code 1 = warnings only
 * Exit code 2 = errors present
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Load data ─────────────────────────────────────────────────────────────────

const EXCHANGES_PATH = path.join(__dirname, '..', 'src', 'data', 'exchanges.json');
const exchanges = JSON.parse(fs.readFileSync(EXCHANGES_PATH, 'utf8'));

// Quick Summary curated slugs (must match bonuses/index.astro)
const QUICK_SUMMARY_SLUGS = ['bybit', 'binance', 'okx', 'mexc', 'bitget', 'bingx', 'kucoin'];

// Risky-wording patterns (mirrors offerValidation.ts)
const RISKY_PATTERNS = [
  { re: /guaranteed\s+(earn|reward|bonus|profit)/i,  risk: 'Guaranteed earnings claim' },
  { re: /100%\s+(bonus|guaranteed|profit)/i,         risk: '100% guarantee claim' },
  { re: /definitely\s+(earn|get|receive)/i,          risk: 'Certainty language' },
  { re: /you will\s+(earn|get|receive|make)/i,       risk: 'Future-certain claim' },
  { re: /instant\s+(withdrawal|cash|payout)/i,       risk: 'Instant payout claim' },
  { re: /risk.?free/i,                               risk: 'Risk-free claim' },
  { re: /no\s+risk/i,                                risk: 'No-risk claim' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

function daysSince(iso) {
  if (!iso) return 9999;
  try { return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)); }
  catch { return 9999; }
}

function fmt(label, ...cols) {
  return `  ${label.padEnd(12)} ${cols.join('  ')}`;
}

let errorCount   = 0;
let warningCount = 0;

function error(msg)   { errorCount++;   console.log(`  ${RED}✖ ${msg}${RESET}`); }
function warn(msg)    { warningCount++; console.log(`  ${YELLOW}⚠ ${msg}${RESET}`); }
function ok(msg)      { console.log(`  ${GREEN}✓ ${msg}${RESET}`); }
function info(msg)    { console.log(`  ${DIM}ℹ ${msg}${RESET}`); }
function section(h)   { console.log(`\n${BOLD}${CYAN}── ${h} ${'─'.repeat(Math.max(0, 60 - h.length))}${RESET}`); }

// ── 1. Stale offer detection ──────────────────────────────────────────────────

section('1. Offer freshness');

const STALE_DAYS    = 30;  // errors
const WARNING_DAYS  = 20;  // warnings

const exchangeMap = {};
for (const ex of exchanges) {
  exchangeMap[ex.slug] = ex;
  const checkDate = ex.offerLastChecked ?? ex.lastVerified ?? ex.updatedAt;
  const days = daysSince(checkDate);
  const slug = ex.slug.padEnd(12);

  if (days > STALE_DAYS) {
    error(`${slug}  ${days} days since last check — STALE (max ${STALE_DAYS}). Re-verify: ${ex.termsUrl ?? 'no termsUrl set'}`);
  } else if (days > WARNING_DAYS) {
    warn(`${slug}  ${days} days since last check — approaching stale threshold`);
  } else {
    ok(`${slug}  verified ${days === 0 ? 'today' : days + ' days ago'}`);
  }
}

// ── 2. Verification status ────────────────────────────────────────────────────

section('2. Verification status');

for (const ex of exchanges) {
  const s = ex.verificationStatus ?? 'unverified';
  const slug = ex.slug.padEnd(12);
  if (s === 'verified') {
    ok(`${slug}  status: verified`);
  } else if (s === 'needs-review') {
    warn(`${slug}  status: needs-review — verify before next deploy`);
  } else if (s === 'outdated') {
    error(`${slug}  status: OUTDATED — must be re-verified`);
  } else {
    error(`${slug}  status: UNVERIFIED — add verificationStatus to exchanges.json`);
  }
}

// ── 3. Bonus amount consistency ───────────────────────────────────────────────

section('3. Bonus amount consistency');

for (const ex of exchanges) {
  const slug = ex.slug.padEnd(12);

  // Check bonusAmount vs bonusRange.max
  if (ex.bonusRange) {
    if (ex.bonusAmount !== ex.bonusRange.max) {
      warn(`${slug}  bonusAmount (${ex.bonusAmount}) != bonusRange.max (${ex.bonusRange.max}) — update one`);
    } else {
      ok(`${slug}  bonusAmount matches bonusRange.max (${ex.bonusAmount})`);
    }
  } else {
    info(`${slug}  no bonusRange set — add min/max/typical for accurate display`);
  }

  // Campaign mode requires recent check
  if (ex.bonusDisplayMode === 'campaign') {
    const days = daysSince(ex.offerLastChecked ?? ex.lastVerified ?? ex.updatedAt);
    if (days > 14) {
      warn(`${slug}  campaign mode — but last checked ${days} days ago. Campaign offers change frequently.`);
    }
  }

  // Suspicious round-number check (> 10,000 USDT)
  if (ex.bonusAmount > 10000 && ex.bonusAmount % 1000 === 0) {
    info(`${slug}  large round bonus: ${ex.bonusAmount} ${ex.bonusCurrency} — confirm via official promo page`);
  }
}

// ── 4. Risky wording audit ────────────────────────────────────────────────────

section('4. Wording audit');

let wordingClean = true;
for (const ex of exchanges) {
  const fields = {
    bonusTitle:               ex.bonusTitle,
    bonusNote:                ex.bonusNote,
    shortDescription:         ex.shortDescription,
    editorNote:               ex.editorNote,
    realisticUserExpectation: ex.realisticUserExpectation,
  };
  for (const [field, text] of Object.entries(fields)) {
    if (!text) continue;
    for (const { re, risk } of RISKY_PATTERNS) {
      if (re.test(text)) {
        error(`${ex.slug.padEnd(12)}  [${field}] ${risk}`);
        error(`             → "${text.slice(0, 100)}"`);
        wordingClean = false;
      }
    }
  }
}
if (wordingClean) ok('No risky wording detected across all exchanges');

// ── 5. Quick Summary slug integrity ──────────────────────────────────────────

section('5. Quick Summary slug integrity');

for (const slug of QUICK_SUMMARY_SLUGS) {
  const ex = exchangeMap[slug];
  if (!ex) {
    error(`Slug "${slug}" in QUICK_SUMMARY_SLUGS not found in exchanges.json`);
  } else {
    const displayText = ex.bonusDisplayMode === 'fixed'
      ? ex.bonusTitle
      : `Up to ${ex.bonusAmount.toLocaleString()} ${ex.bonusCurrency}`;
    ok(`${slug.padEnd(12)}  → "${displayText}"`);
  }
}

// ── 6. Missing critical fields ────────────────────────────────────────────────

section('6. Required fields check');

const REQUIRED_FIELDS = ['bonusAmount', 'bonusCurrency', 'bonusDisplayMode', 'offerLastChecked', 'termsUrl', 'affiliateUrl'];

for (const ex of exchanges) {
  const slug = ex.slug.padEnd(12);
  const missing = REQUIRED_FIELDS.filter(f => !ex[f]);
  if (missing.length > 0) {
    warn(`${slug}  missing fields: ${missing.join(', ')}`);
  } else {
    ok(`${slug}  all required fields present`);
  }
}

// ── Final report ──────────────────────────────────────────────────────────────

section('Report');

console.log(`\n  ${BOLD}Total exchanges:${RESET}  ${exchanges.length}`);
console.log(`  ${RED}${BOLD}Errors:${RESET}           ${errorCount}`);
console.log(`  ${YELLOW}${BOLD}Warnings:${RESET}         ${warningCount}`);

if (errorCount === 0 && warningCount === 0) {
  console.log(`\n${GREEN}${BOLD}  ✅ All checks passed — data is clean and consistent.${RESET}\n`);
  process.exit(0);
} else if (errorCount === 0) {
  console.log(`\n${YELLOW}${BOLD}  ⚠  Warnings present — review before deploying to production.${RESET}\n`);
  // Warnings must not break the validate:all && chain — only errors are fatal.
  // (Before this fix, 10 warnings here silently prevented evidence + affiliate checks from running.)
  process.exit(0);
} else {
  console.log(`\n${RED}${BOLD}  ✖  Errors found — fix before deploying.${RESET}\n`);
  process.exit(2);
}
