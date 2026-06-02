#!/usr/bin/env node
/**
 * CryptoBonusWorld — Screenshot Capture Checklist
 *
 * Usage:
 *   node scripts/screenshot-checklist.mjs
 *   node scripts/screenshot-checklist.mjs --exchange binance
 *   node scripts/screenshot-checklist.mjs --missing-only
 *   node scripts/screenshot-checklist.mjs --json
 *   node scripts/screenshot-checklist.mjs --validate
 *
 * Options:
 *   --exchange <slug>   Show checklist for one exchange
 *   --missing-only      Only show categories needing capture (skip not_applicable)
 *   --json              Output JSON for CI/dashboard consumption
 *   --validate          Also check path existence and file extension
 *   --help              Show this help
 *
 * Path convention:
 *   public/screenshots/{exchange}/{category}/{geo}-{device}-{yyyy-mm}.webp
 *   e.g.  public/screenshots/binance/registration/global-desktop-2026-06.webp
 *
 * Exit codes:
 *   0 — All applicable screenshots available
 *   1 — Missing screenshots found (needs capture)
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT         = join(__dirname, '..');
const EVIDENCE_DIR = join(ROOT, 'src', 'data', 'evidence');
const PUBLIC_DIR   = join(ROOT, 'public');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {
  exchange:    args.includes('--exchange') ? args[args.indexOf('--exchange') + 1] : null,
  missingOnly: args.includes('--missing-only'),
  json:        args.includes('--json'),
  validate:    args.includes('--validate'),
  help:        args.includes('--help'),
};

if (flags.help) {
  console.log(`
Screenshot Capture Checklist — CryptoBonusWorld

Usage:
  node scripts/screenshot-checklist.mjs [options]

Options:
  --exchange <slug>   Show checklist for one exchange
  --missing-only      Only show pending captures (skip not_applicable)
  --json              Output JSON (for CI/dashboard)
  --validate          Check that available paths exist on disk
  --help              Show this help

Path convention:
  public/screenshots/{exchange}/{category}/{geo}-{device}-{yyyy-mm}.webp
`);
  process.exit(0);
}

// ── Suggested capture URLs per exchange per category ─────────────────────────

const CAPTURE_URLS = {
  bybit: {
    registration:    'https://www.bybit.com/en/register',
    kyc:             'https://www.bybit.com/user/identity/personal',
    bonus:           'https://www.bybit.com/en/activity/',
    deposit:         'https://www.bybit.com/user/assets/home',
    p2p:             'https://www.bybit.com/en/p2p/',
    spot:            'https://www.bybit.com/en/trade/spot/BTC/USDT',
    futures:         'https://www.bybit.com/trade/usdt/BTCUSDT',
    fees:            'https://www.bybit.com/en/help-center/article/Trading-Fee-Structure',
    mobile_app:      'https://apps.apple.com/app/bybit/id1488296980',
    proof_of_reserves: 'https://www.bybit.com/en/proof-of-reserves/',
  },
  binance: {
    registration:    'https://www.binance.com/en/register',
    kyc:             'https://www.binance.com/en/my/settings/profile',
    bonus:           'https://www.binance.com/en/activity/',
    deposit:         'https://www.binance.com/en/my/wallet/account/main',
    p2p:             'https://p2p.binance.com/en',
    spot:            'https://www.binance.com/en/trade/BTC_USDT',
    futures:         'https://www.binance.com/en/futures/BTCUSDT',
    fees:            'https://www.binance.com/en/fee/schedule',
    mobile_app:      'https://apps.apple.com/app/binance/id1436799971',
    proof_of_reserves: 'https://www.binance.com/en/proof-of-reserves',
  },
  mexc: {
    registration:    'https://www.mexc.com/register',
    kyc:             null,
    bonus:           'https://www.mexc.com/en-US/activity',
    deposit:         'https://www.mexc.com/assets/deposit',
    p2p:             'https://www.mexc.com/p2p',
    spot:            'https://www.mexc.com/exchange/BTC_USDT',
    futures:         'https://futures.mexc.com/exchange/BTC_USDT',
    fees:            'https://www.mexc.com/fee',
    mobile_app:      'https://apps.apple.com/app/mexc/id1581119500',
    proof_of_reserves: null,
  },
  okx: {
    registration:    'https://www.okx.com/join',
    kyc:             'https://www.okx.com/account/kyc',
    bonus:           'https://www.okx.com/campaigns/new-user',
    deposit:         'https://www.okx.com/balance/recharge',
    p2p:             null,
    spot:            'https://www.okx.com/trade-spot/btc-usdt',
    futures:         'https://www.okx.com/trade-futures/btc-usdt-swap',
    fees:            'https://www.okx.com/fees',
    mobile_app:      'https://apps.apple.com/app/okx/id1327268470',
    proof_of_reserves: 'https://www.okx.com/proof-of-reserves',
  },
  bitget: {
    registration:    'https://www.bitget.com/register',
    kyc:             'https://www.bitget.com/account/verify',
    bonus:           'https://www.bitget.com/en/activity',
    deposit:         'https://www.bitget.com/asset/recharge',
    p2p:             null,
    spot:            'https://www.bitget.com/spot/BTCUSDT',
    futures:         'https://www.bitget.com/futures/usdt/BTCUSDT',
    fees:            'https://www.bitget.com/rate',
    mobile_app:      'https://apps.apple.com/app/bitget/id1488296980',
    proof_of_reserves: 'https://www.bitget.com/en/proof-of-reserves',
  },
  bingx: {
    registration:    'https://bingx.com/invite/register',
    kyc:             'https://bingx.com/account/kyc',
    bonus:           'https://bingx.com/en-us/activity/',
    deposit:         'https://bingx.com/en-us/asset/',
    p2p:             null,
    spot:            'https://bingx.com/en-us/spot/BTCUSDT/',
    futures:         'https://bingx.com/en-us/perpetual/BTC-USDT/',
    fees:            'https://bingx.com/en-us/support/fee/',
    mobile_app:      'https://apps.apple.com/app/bingx/id1498241566',
    proof_of_reserves: null,
  },
  'gate-io': {
    registration:    'https://www.gate.io/signup',
    kyc:             'https://www.gate.io/settings/kyc',
    bonus:           'https://www.gate.io/activity',
    deposit:         'https://www.gate.io/myaccount/deposit',
    p2p:             'https://www.gate.io/p2p',
    spot:            'https://www.gate.io/trade/BTC_USDT',
    futures:         'https://www.gate.io/futures_trade/usdt/btc_usdt',
    fees:            'https://www.gate.io/fee',
    mobile_app:      'https://apps.apple.com/app/gate-io/id1294980941',
    proof_of_reserves: 'https://www.gate.io/proof_of_assets',
  },
  kucoin: {
    registration:    'https://www.kucoin.com/ucenter/signup',
    kyc:             null,
    bonus:           'https://www.kucoin.com/activity',
    deposit:         'https://www.kucoin.com/assets/main',
    p2p:             'https://www.kucoin.com/otc',
    spot:            'https://www.kucoin.com/trade/BTC-USDT',
    futures:         'https://www.kucoin.com/futures/trade/XBTUSDTM',
    fees:            'https://www.kucoin.com/vip/level',
    mobile_app:      'https://apps.apple.com/app/kucoin/id1378956601',
    proof_of_reserves: 'https://www.kucoin.com/legal/proof-of-reserves',
  },
  htx: {
    registration:    'https://www.htx.com/en-us/register',
    kyc:             'https://www.htx.com/en-us/pro/user-center/auth',
    bonus:           'https://www.htx.com/en-us/topic/newbie/',
    deposit:         'https://www.htx.com/en-us/finance/deposit/',
    p2p:             'https://otc.htx.com/en-us/trade/buy/usdt',
    spot:            'https://www.htx.com/en-us/trade/btc_usdt',
    futures:         'https://futures.htx.com/en-us/linear_swap/exchange/',
    fees:            'https://www.htx.com/en-us/about/fee/',
    mobile_app:      'https://apps.apple.com/app/htx/id1023263449',
    proof_of_reserves: null,
  },
  coinex: {
    registration:    'https://www.coinex.com/register',
    kyc:             null,
    bonus:           'https://www.coinex.com/activity',
    deposit:         'https://www.coinex.com/asset/deposit',
    p2p:             null,
    spot:            'https://www.coinex.com/exchange/BTC-USDT',
    futures:         'https://www.coinex.com/futures/BTC-USDT',
    fees:            'https://www.coinex.com/fees',
    mobile_app:      'https://apps.apple.com/app/coinex/id1378251936',
    proof_of_reserves: 'https://www.coinex.com/proof-of-reserves',
  },
  phemex: {
    registration:    'https://phemex.com/register',
    kyc:             null,
    bonus:           'https://phemex.com/activity',
    deposit:         'https://phemex.com/assets/deposit',
    p2p:             null,
    spot:            'https://phemex.com/spot/trade/BTC-USDT',
    futures:         'https://phemex.com/trade/BTCUSD',
    fees:            'https://phemex.com/rate-limits',
    mobile_app:      'https://apps.apple.com/app/phemex/id1436830174',
    proof_of_reserves: 'https://phemex.com/proof-of-reserves',
  },
  bitunix: {
    registration:    'https://www.bitunix.com/register',
    kyc:             'https://www.bitunix.com/account/kyc',
    bonus:           'https://www.bitunix.com/activity',
    deposit:         'https://www.bitunix.com/assets',
    p2p:             null,
    spot:            'https://www.bitunix.com/trade/BTCUSDT',
    futures:         'https://www.bitunix.com/futures/BTC',
    fees:            'https://www.bitunix.com/fee-rate',
    mobile_app:      'https://apps.apple.com/app/bitunix/id6472929966',
    proof_of_reserves: null,
  },
  lbank: {
    registration:    'https://www.lbank.com/en-US/register/',
    kyc:             'https://www.lbank.com/en-US/user/auth/',
    bonus:           'https://www.lbank.com/en-US/activity/',
    deposit:         'https://www.lbank.com/en-US/finance/',
    p2p:             null,
    spot:            'https://www.lbank.com/en-US/trade/btc_usdt/',
    futures:         'https://futures.lbank.com/trade/btcusdt',
    fees:            'https://www.lbank.com/en-US/docs/index.html#fees',
    mobile_app:      'https://apps.apple.com/app/lbank/id1443638925',
    proof_of_reserves: null,
  },
  coinbase: {
    registration:    'https://www.coinbase.com/signup',
    kyc:             'https://www.coinbase.com/verify',
    bonus:           'https://www.coinbase.com/earn',
    deposit:         'https://www.coinbase.com/assets',
    p2p:             null,
    spot:            'https://www.coinbase.com/advanced-trade/spot/BTC-USD',
    futures:         null,
    fees:            'https://www.coinbase.com/legal/fees',
    mobile_app:      'https://apps.apple.com/app/coinbase-buy-bitcoin-ethereum/id886427730',
    proof_of_reserves: null,
  },
};

// ── Exchange priority ranking ─────────────────────────────────────────────────

const PRIORITY_RANK = {
  binance: 1, okx: 2, mexc: 3, bitget: 4, coinbase: 5, bingx: 6,
  bybit: 7, 'gate-io': 8, kucoin: 9, htx: 10,
  coinex: 11, phemex: 12, bitunix: 13, lbank: 14,
};

function getPriority(slug) {
  const rank = PRIORITY_RANK[slug] ?? 99;
  return rank <= 3 ? 'P1' : rank <= 6 ? 'P2' : rank <= 10 ? 'P3' : 'P4';
}

// ── Load evidence files ───────────────────────────────────────────────────────

function loadEvidenceFiles() {
  return readdirSync(EVIDENCE_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(f => {
      try {
        return JSON.parse(readFileSync(join(EVIDENCE_DIR, f), 'utf8'));
      } catch { return null; }
    })
    .filter(Boolean);
}

// ── Screenshot validation ─────────────────────────────────────────────────────

const VALID_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg']);

function validateScreenshotEntry(slug, category, entry) {
  const issues = [];

  if (entry.status === 'available') {
    // Must have a path
    if (!entry.path) {
      issues.push({ severity: 'error', message: 'status=available but path is null' });
    } else {
      // Extension check
      const ext = extname(entry.path).toLowerCase();
      if (!VALID_EXTENSIONS.has(ext)) {
        issues.push({ severity: 'error', message: `Invalid extension: ${ext} (expected .webp/.png/.jpg)` });
      }
      // File existence (only when --validate flag is set)
      if (flags.validate) {
        const fullPath = join(PUBLIC_DIR, entry.path.replace(/^\//, ''));
        if (!existsSync(fullPath)) {
          issues.push({ severity: 'error', message: `File not found on disk: ${entry.path}` });
        }
      }
    }
    // capturedAt must be set and valid YYYY-MM
    if (!entry.capturedAt) {
      issues.push({ severity: 'warn', message: 'status=available but capturedAt is null' });
    } else if (!/^\d{4}-\d{2}$/.test(entry.capturedAt)) {
      issues.push({ severity: 'error', message: `Invalid capturedAt format: ${entry.capturedAt} (expected YYYY-MM)` });
    } else {
      // Staleness check (>90 days)
      const captured = new Date(entry.capturedAt + '-01');
      const ageDays = (Date.now() - captured.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > 90) {
        issues.push({ severity: 'warn', message: `Screenshot stale (${Math.round(ageDays)}d old, max 90d)` });
      }
    }
  }

  return issues;
}

// ── Checklist row builder ─────────────────────────────────────────────────────

const CATEGORIES = [
  'registration', 'kyc', 'bonus', 'deposit', 'p2p',
  'spot', 'futures', 'fees', 'mobile_app', 'proof_of_reserves',
];

function buildChecklist(ev) {
  const slug = ev.exchange;
  const rows = [];

  for (const category of CATEGORIES) {
    const entry = ev.screenshots?.[category];
    if (!entry) continue;

    const isMissing = entry.status === 'needs_manual_capture' || entry.status === 'missing';
    const isAvailable = entry.status === 'available';
    const isNotApplicable = entry.status === 'not_applicable';
    const isOutdated = entry.status === 'outdated';

    // Filter based on flags
    if (flags.missingOnly && !isMissing && !isOutdated) continue;

    const captureUrl = CAPTURE_URLS[slug]?.[category] ?? null;
    const validationIssues = validateScreenshotEntry(slug, category, entry);
    const suggestedPath = entry.path
      ?? `/screenshots/${slug}/${category}/global-${entry.device || 'desktop'}-${new Date().toISOString().slice(0, 7)}.webp`;

    rows.push({
      exchange:    slug,
      category,
      status:      entry.status,
      priority:    getPriority(slug),
      device:      entry.device ?? 'desktop',
      geo:         entry.geo ?? 'GLOBAL',
      captureUrl,
      suggestedPath,
      notes:       entry.notes ?? '',
      issues:      validationIssues,
    });
  }

  return rows;
}

// ── Output formatters ─────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const BLUE   = '\x1b[34m';

function statusIcon(s) {
  if (s === 'available')          return `${GREEN}✓${RESET}`;
  if (s === 'needs_manual_capture') return `${YELLOW}⬜${RESET}`;
  if (s === 'missing')            return `${YELLOW}⬜${RESET}`;
  if (s === 'outdated')           return `${YELLOW}⟳${RESET}`;
  if (s === 'not_applicable')     return `${DIM}—${RESET}`;
  return '?';
}

function printChecklist(rows, exchangeSlug) {
  const available    = rows.filter(r => r.status === 'available').length;
  const applicable   = rows.filter(r => r.status !== 'not_applicable').length;
  const missing      = rows.filter(r => r.status === 'needs_manual_capture' || r.status === 'missing').length;
  const outdated     = rows.filter(r => r.status === 'outdated').length;

  const name = (exchangeSlug ?? 'All exchanges').toUpperCase();
  console.log(`\n${BOLD}${name}${RESET}  ${DIM}(${available}/${applicable} captured, ${missing} pending, ${outdated} outdated)${RESET}`);

  for (const row of rows) {
    const icon = statusIcon(row.status);
    const catPad = row.category.padEnd(18);
    const priBadge = `${CYAN}${row.priority}${RESET}`;

    if (row.status === 'not_applicable') {
      if (!flags.missingOnly) {
        console.log(`  ${icon} ${DIM}${catPad}${RESET}  ${DIM}not applicable${RESET}`);
      }
      continue;
    }

    if (row.status === 'available' && !flags.missingOnly) {
      console.log(`  ${icon} ${catPad}  ${GREEN}available${RESET}  ${DIM}${row.suggestedPath}${RESET}`);
      continue;
    }

    // Missing / outdated — show action line
    const urlPart = row.captureUrl ? `  ${BLUE}${row.captureUrl}${RESET}` : '';
    const notePart = row.notes ? `  ${DIM}${row.notes}${RESET}` : '';
    console.log(`  ${icon} ${YELLOW}${catPad}${RESET}  ${priBadge}  device:${row.device}  geo:${row.geo}${urlPart}${notePart}`);

    if (row.issues.length > 0) {
      for (const issue of row.issues) {
        const col = issue.severity === 'error' ? RED : YELLOW;
        console.log(`      ${col}⚠ ${issue.message}${RESET}`);
      }
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const allEvidence = loadEvidenceFiles();

  let toProcess = allEvidence;
  if (flags.exchange) {
    toProcess = allEvidence.filter(ev => ev.exchange === flags.exchange);
    if (toProcess.length === 0) {
      console.error(`No evidence file found for exchange: ${flags.exchange}`);
      console.error(`Available: ${allEvidence.map(e => e.exchange).join(', ')}`);
      process.exit(1);
    }
  }

  // Sort by priority rank
  toProcess.sort((a, b) => (PRIORITY_RANK[a.exchange] ?? 99) - (PRIORITY_RANK[b.exchange] ?? 99));

  const allRows = toProcess.flatMap(ev => buildChecklist(ev).map(r => ({ ...r })));

  // JSON output
  if (flags.json) {
    const summary = {
      generatedAt:   new Date().toISOString(),
      totalExchanges: toProcess.length,
      totalSlots:     allRows.length,
      available:      allRows.filter(r => r.status === 'available').length,
      pending:        allRows.filter(r => r.status === 'needs_manual_capture' || r.status === 'missing').length,
      outdated:       allRows.filter(r => r.status === 'outdated').length,
      notApplicable:  allRows.filter(r => r.status === 'not_applicable').length,
      rows: allRows,
    };
    console.log(JSON.stringify(summary, null, 2));
    process.exit(summary.pending > 0 ? 1 : 0);
  }

  // Text output
  const totalAvailable   = allRows.filter(r => r.status === 'available').length;
  const totalPending     = allRows.filter(r => r.status === 'needs_manual_capture' || r.status === 'missing').length;
  const totalOutdated    = allRows.filter(r => r.status === 'outdated').length;
  const totalNotAppl     = allRows.filter(r => r.status === 'not_applicable').length;
  const totalApplicable  = allRows.length - totalNotAppl;
  const coveragePct      = totalApplicable > 0 ? Math.round(totalAvailable / totalApplicable * 100) : 100;

  console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  CryptoBonusWorld — Screenshot Capture Checklist${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`  Exchanges: ${toProcess.length}  ·  Slots: ${allRows.length}`);
  console.log(`  ${GREEN}Available: ${totalAvailable}${RESET}  ·  ${YELLOW}Pending: ${totalPending}${RESET}  ·  ${YELLOW}Outdated: ${totalOutdated}${RESET}  ·  ${DIM}N/A: ${totalNotAppl}${RESET}`);
  console.log(`  Coverage: ${coveragePct >= 80 ? GREEN : coveragePct >= 50 ? YELLOW : RED}${coveragePct}%${RESET} of applicable slots captured`);
  console.log(`  Generated: ${new Date().toISOString()}`);

  if (flags.exchange) {
    const ev = toProcess[0];
    printChecklist(allRows, ev.exchange);
  } else {
    // Group by exchange
    for (const ev of toProcess) {
      const rows = allRows.filter(r => r.exchange === ev.exchange);
      printChecklist(rows, ev.exchange);
    }
  }

  // Priority action list — top 20 missing
  const pendingRows = allRows
    .filter(r => r.status === 'needs_manual_capture' || r.status === 'missing')
    .sort((a, b) => {
      const ap = parseInt(a.priority.slice(1));
      const bp = parseInt(b.priority.slice(1));
      return ap !== bp ? ap - bp : a.category.localeCompare(b.category);
    });

  if (pendingRows.length > 0) {
    console.log(`\n${BOLD}${YELLOW}── Priority Capture Queue ──────────────────────────────${RESET}`);
    for (const row of pendingRows.slice(0, 20)) {
      const urlPart = row.captureUrl ? ` → ${row.captureUrl}` : '';
      console.log(`  ${CYAN}${row.priority}${RESET}  ${row.exchange.padEnd(12)} ${YELLOW}${row.category.padEnd(18)}${RESET} device:${row.device}${DIM}${urlPart}${RESET}`);
    }
    if (pendingRows.length > 20) {
      console.log(`  ${DIM}… and ${pendingRows.length - 20} more${RESET}`);
    }
  }

  console.log(`\n${DIM}Naming convention: public/screenshots/{exchange}/{category}/global-desktop-YYYY-MM.webp${RESET}`);
  console.log(`${DIM}Run with --help for options${RESET}\n`);

  process.exit(totalPending > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Checklist failed:', err);
  process.exit(1);
});
