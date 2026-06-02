/**
 * audit-exchange-screenshots.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized screenshot audit for CryptoBonusWorld.
 * Reads evidence JSON files and validates screenshot metadata.
 *
 * Audit rules:
 *   1.  All 14 required exchanges exist in the evidence registry
 *   2.  All 10 screenshot categories present per exchange
 *   3.  status=available must have a non-null path
 *   4.  path extension must be .webp, .png, or .jpg
 *   5.  Path must exist on disk when status=available (CI error if missing file)
 *   6.  capturedAt must match YYYY-MM or YYYY-MM-DD when set
 *   7.  expiresAt-equivalent: stale warning if capturedAt > 90 days ago
 *   8.  No duplicate (exchange × category × geo × device) variants
 *   9.  No placeholder/dummy paths (#, placeholder, /path/to/, example.com)
 *  10.  Missing screenshots → WARNING (not CI error)
 *  11.  Broken available screenshots → CI ERROR (file missing, invalid path)
 *  12.  not_applicable + path set → WARNING (inconsistency)
 *
 * Usage:
 *   node scripts/audit-exchange-screenshots.mjs              # pretty-print
 *   node scripts/audit-exchange-screenshots.mjs --write      # write reports
 *   node scripts/audit-exchange-screenshots.mjs --fail-on-errors  # exit 1 on errors
 *   node scripts/audit-exchange-screenshots.mjs --json       # JSON to stdout
 *
 * Exit codes:
 *   0 — passed (may have warnings)
 *   1 — CI errors found (broken available screenshots)
 *
 * Output files (--write):
 *   reports/exchange-screenshot-report.md
 *   reports/exchange-screenshot-report.json
 */

import {
  readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync,
} from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const EVIDENCE   = join(ROOT, 'src', 'data', 'evidence');
const PUBLIC_DIR = join(ROOT, 'public');
const REPORTS    = join(ROOT, 'reports');

const args = process.argv.slice(2);
const WRITE_MODE      = args.includes('--write');
const JSON_MODE       = args.includes('--json');
const FAIL_ON_ERRORS  = args.includes('--fail-on-errors');
const VERBOSE         = args.includes('--verbose');

// ── Static metadata ───────────────────────────────────────────────────────────

const REQUIRED_EXCHANGES = [
  'binance', 'okx', 'mexc', 'bitget', 'coinbase', 'bingx',
  'bybit', 'gate-io', 'kucoin', 'htx',
  'coinex', 'phemex', 'bitunix', 'lbank',
];

const ALL_CATEGORIES = [
  'registration', 'kyc', 'bonus', 'deposit', 'p2p',
  'spot', 'futures', 'fees', 'mobile_app', 'proof_of_reserves',
];

const PRIORITY_RANK = {
  binance: 1, okx: 2, mexc: 3, bitget: 4, coinbase: 5, bingx: 6,
  bybit: 7, 'gate-io': 8, kucoin: 9, htx: 10,
  coinex: 11, phemex: 12, bitunix: 13, lbank: 14,
};

const CAPTURE_URLS = {
  bybit:    { registration:'https://www.bybit.com/en/register', kyc:'https://www.bybit.com/user/identity/personal', bonus:'https://www.bybit.com/en/activity/', deposit:'https://www.bybit.com/user/assets/home', p2p:'https://www.bybit.com/en/p2p/', spot:'https://www.bybit.com/en/trade/spot/BTC/USDT', futures:'https://www.bybit.com/trade/usdt/BTCUSDT', fees:'https://www.bybit.com/en/help-center/article/Trading-Fee-Structure', mobile_app:'https://apps.apple.com/app/bybit/id1488296980', proof_of_reserves:'https://www.bybit.com/en/proof-of-reserves/' },
  binance:  { registration:'https://www.binance.com/en/register', kyc:'https://www.binance.com/en/my/settings/profile', bonus:'https://www.binance.com/en/activity/', deposit:'https://www.binance.com/en/my/wallet/account/main', p2p:'https://p2p.binance.com/en', spot:'https://www.binance.com/en/trade/BTC_USDT', futures:'https://www.binance.com/en/futures/BTCUSDT', fees:'https://www.binance.com/en/fee/schedule', mobile_app:'https://apps.apple.com/app/binance/id1436799971', proof_of_reserves:'https://www.binance.com/en/proof-of-reserves' },
  mexc:     { registration:'https://www.mexc.com/register', kyc:null, bonus:'https://www.mexc.com/en-US/activity', deposit:'https://www.mexc.com/assets/deposit', p2p:'https://www.mexc.com/p2p', spot:'https://www.mexc.com/exchange/BTC_USDT', futures:'https://futures.mexc.com/exchange/BTC_USDT', fees:'https://www.mexc.com/fee', mobile_app:'https://apps.apple.com/app/mexc/id1581119500', proof_of_reserves:null },
  okx:      { registration:'https://www.okx.com/join', kyc:'https://www.okx.com/account/kyc', bonus:'https://www.okx.com/campaigns/new-user', deposit:'https://www.okx.com/balance/recharge', p2p:null, spot:'https://www.okx.com/trade-spot/btc-usdt', futures:'https://www.okx.com/trade-futures/btc-usdt-swap', fees:'https://www.okx.com/fees', mobile_app:'https://apps.apple.com/app/okx/id1327268470', proof_of_reserves:'https://www.okx.com/proof-of-reserves' },
  bitget:   { registration:'https://www.bitget.com/register', kyc:'https://www.bitget.com/account/verify', bonus:'https://www.bitget.com/en/activity', deposit:'https://www.bitget.com/asset/recharge', p2p:null, spot:'https://www.bitget.com/spot/BTCUSDT', futures:'https://www.bitget.com/futures/usdt/BTCUSDT', fees:'https://www.bitget.com/rate', mobile_app:'https://apps.apple.com/app/bitget/id1488296980', proof_of_reserves:'https://www.bitget.com/en/proof-of-reserves' },
  bingx:    { registration:'https://bingx.com/invite/register', kyc:'https://bingx.com/account/kyc', bonus:'https://bingx.com/en-us/activity/', deposit:'https://bingx.com/en-us/asset/', p2p:null, spot:'https://bingx.com/en-us/spot/BTCUSDT/', futures:'https://bingx.com/en-us/perpetual/BTC-USDT/', fees:'https://bingx.com/en-us/support/fee/', mobile_app:'https://apps.apple.com/app/bingx/id1498241566', proof_of_reserves:null },
  'gate-io':{ registration:'https://www.gate.io/signup', kyc:'https://www.gate.io/settings/kyc', bonus:'https://www.gate.io/activity', deposit:'https://www.gate.io/myaccount/deposit', p2p:'https://www.gate.io/p2p', spot:'https://www.gate.io/trade/BTC_USDT', futures:'https://www.gate.io/futures_trade/usdt/btc_usdt', fees:'https://www.gate.io/fee', mobile_app:'https://apps.apple.com/app/gate-io/id1294980941', proof_of_reserves:'https://www.gate.io/proof_of_assets' },
  kucoin:   { registration:'https://www.kucoin.com/ucenter/signup', kyc:null, bonus:'https://www.kucoin.com/activity', deposit:'https://www.kucoin.com/assets/main', p2p:'https://www.kucoin.com/otc', spot:'https://www.kucoin.com/trade/BTC-USDT', futures:'https://www.kucoin.com/futures/trade/XBTUSDTM', fees:'https://www.kucoin.com/vip/level', mobile_app:'https://apps.apple.com/app/kucoin/id1378956601', proof_of_reserves:'https://www.kucoin.com/legal/proof-of-reserves' },
  htx:      { registration:'https://www.htx.com/en-us/register', kyc:'https://www.htx.com/en-us/pro/user-center/auth', bonus:'https://www.htx.com/en-us/topic/newbie/', deposit:'https://www.htx.com/en-us/finance/deposit/', p2p:'https://otc.htx.com/en-us/trade/buy/usdt', spot:'https://www.htx.com/en-us/trade/btc_usdt', futures:'https://futures.htx.com/en-us/linear_swap/exchange/', fees:'https://www.htx.com/en-us/about/fee/', mobile_app:'https://apps.apple.com/app/htx/id1023263449', proof_of_reserves:null },
  coinex:   { registration:'https://www.coinex.com/register', kyc:null, bonus:'https://www.coinex.com/activity', deposit:'https://www.coinex.com/asset/deposit', p2p:null, spot:'https://www.coinex.com/exchange/BTC-USDT', futures:'https://www.coinex.com/futures/BTC-USDT', fees:'https://www.coinex.com/fees', mobile_app:'https://apps.apple.com/app/coinex/id1378251936', proof_of_reserves:'https://www.coinex.com/proof-of-reserves' },
  phemex:   { registration:'https://phemex.com/register', kyc:null, bonus:'https://phemex.com/activity', deposit:'https://phemex.com/assets/deposit', p2p:null, spot:'https://phemex.com/spot/trade/BTC-USDT', futures:'https://phemex.com/trade/BTCUSD', fees:'https://phemex.com/rate-limits', mobile_app:'https://apps.apple.com/app/phemex/id1436830174', proof_of_reserves:'https://phemex.com/proof-of-reserves' },
  bitunix:  { registration:'https://www.bitunix.com/register', kyc:'https://www.bitunix.com/account/kyc', bonus:'https://www.bitunix.com/activity', deposit:'https://www.bitunix.com/assets', p2p:null, spot:'https://www.bitunix.com/trade/BTCUSDT', futures:'https://www.bitunix.com/futures/BTC', fees:'https://www.bitunix.com/fee-rate', mobile_app:'https://apps.apple.com/app/bitunix/id6472929966', proof_of_reserves:null },
  lbank:    { registration:'https://www.lbank.com/en-US/register/', kyc:'https://www.lbank.com/en-US/user/auth/', bonus:'https://www.lbank.com/en-US/activity/', deposit:'https://www.lbank.com/en-US/finance/', p2p:null, spot:'https://www.lbank.com/en-US/trade/btc_usdt/', futures:'https://futures.lbank.com/trade/btcusdt', fees:'https://www.lbank.com/en-US/docs/index.html#fees', mobile_app:'https://apps.apple.com/app/lbank/id1443638925', proof_of_reserves:null },
  coinbase: { registration:'https://www.coinbase.com/signup', kyc:'https://www.coinbase.com/verify', bonus:'https://www.coinbase.com/earn', deposit:'https://www.coinbase.com/assets', p2p:null, spot:'https://www.coinbase.com/advanced-trade/spot/BTC-USD', futures:null, fees:'https://www.coinbase.com/legal/fees', mobile_app:'https://apps.apple.com/app/coinbase/id886427730', proof_of_reserves:null },
};

function getPriority(slug) {
  const rank = PRIORITY_RANK[slug] ?? 99;
  return rank <= 3 ? 'P1' : rank <= 6 ? 'P2' : rank <= 10 ? 'P3' : 'P4';
}

// ── Load evidence files ───────────────────────────────────────────────────────

function loadEvidence() {
  const files = readdirSync(EVIDENCE)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const registry = {};
  for (const f of files) {
    try {
      const ev = JSON.parse(readFileSync(join(EVIDENCE, f), 'utf8'));
      if (ev.exchange) registry[ev.exchange] = ev;
    } catch { /* skip malformed files */ }
  }
  return registry;
}

// ── Validation helpers ────────────────────────────────────────────────────────

const VALID_EXTS = new Set(['.webp', '.png', '.jpg', '.jpeg']);
const STALE_DAYS = 90;

const PLACEHOLDER_PATTERNS = [
  /^#/, /placeholder/i, /\/path\/to\//i, /example\.com/i,
  /TODO/i, /FIXME/i, /\btest\b/i,
];

function isPlaceholderPath(path) {
  return PLACEHOLDER_PATTERNS.some(re => re.test(path));
}

function ageInDays(capturedAt) {
  const dateStr = capturedAt.length === 7 ? capturedAt + '-01' : capturedAt;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

function isValidDateStr(s) {
  return /^\d{4}-\d{2}(-\d{2})?$/.test(s) && !isNaN(new Date(s.length === 7 ? s + '-01' : s).getTime());
}

// ── Audit engine ──────────────────────────────────────────────────────────────

function auditEvidence(registry) {
  const errors   = [];
  const warnings = [];
  const info     = [];

  const err  = (msg) => errors.push(msg);
  const warn = (msg) => warnings.push(msg);

  // Rule 1: all required exchanges present
  for (const slug of REQUIRED_EXCHANGES) {
    if (!registry[slug]) {
      err(`[missing-exchange] Exchange "${slug}" not found in evidence registry`);
    }
  }

  const exchangeEntries = []; // flat list for report

  for (const [slug, ev] of Object.entries(registry)) {
    const screenshots = ev.screenshots ?? {};
    const rank = PRIORITY_RANK[slug] ?? 99;
    const priority = getPriority(slug);

    // Rule 2: all categories present
    for (const cat of ALL_CATEGORIES) {
      if (!screenshots[cat]) {
        warn(`[missing-category] ${slug}/${cat} — category absent from evidence file`);
      }
    }

    // Track seen variants for duplicate detection
    const seen = new Set();

    for (const [cat, entry] of Object.entries(screenshots)) {
      if (!entry) continue;

      const ref = `${slug}/${cat}`;
      const status = entry.status;
      const path   = entry.path ?? null;
      const geo    = entry.geo ?? 'GLOBAL';
      const device = entry.device ?? 'desktop';
      const capturedAt = entry.capturedAt ?? null;

      // Build variant key for duplicate check (Rule 8)
      const variantKey = `${slug}:${cat}:${geo}:${device}`;
      if (seen.has(variantKey)) {
        warn(`[duplicate-variant] ${ref} — duplicate geo/device variant: ${geo}/${device}`);
      }
      seen.add(variantKey);

      // Rule 12: not_applicable should not have a path
      if (status === 'not_applicable' && path) {
        warn(`[na-with-path] ${ref} — status=not_applicable but path is set: ${path}`);
      }

      if (status === 'available') {
        // Rule 3: must have a path
        if (!path) {
          err(`[broken-available] ${ref} — status=available but path is null`);
          continue;
        }

        // Rule 9: no placeholder paths
        if (isPlaceholderPath(path)) {
          err(`[placeholder-path] ${ref} — path looks like a placeholder: ${path}`);
        }

        // Rule 4: valid extension
        const ext = extname(path).toLowerCase();
        if (!VALID_EXTS.has(ext)) {
          err(`[invalid-extension] ${ref} — invalid extension "${ext}" (expected .webp/.png/.jpg)`);
        }

        // Rule 5: file must exist on disk
        const fullPath = join(PUBLIC_DIR, path.replace(/^\//, ''));
        if (!existsSync(fullPath)) {
          err(`[file-not-found] ${ref} — path set but file missing on disk: ${path}`);
        }

        // Rule 6: capturedAt format
        if (!capturedAt) {
          warn(`[missing-capturedat] ${ref} — status=available but capturedAt is null`);
        } else if (!isValidDateStr(capturedAt)) {
          err(`[invalid-capturedat] ${ref} — capturedAt format invalid: "${capturedAt}" (expected YYYY-MM)`);
        } else {
          // Rule 7: staleness
          const age = ageInDays(capturedAt);
          if (age > STALE_DAYS) {
            warn(`[stale] ${ref} — screenshot is ${Math.round(age)}d old (threshold: ${STALE_DAYS}d), capturedAt: ${capturedAt}`);
          }
        }
      } else if (status === 'missing' || status === 'needs_manual_capture') {
        // Rule 10: missing → warning only
        warn(`[missing] ${ref} — screenshot not yet captured (${status})`);
      } else if (status === 'outdated') {
        warn(`[outdated] ${ref} — screenshot marked as outdated`);
        if (capturedAt && isValidDateStr(capturedAt)) {
          warn(`[stale] ${ref} — was captured at ${capturedAt}`);
        }
      }

      exchangeEntries.push({
        slug,
        category: cat,
        status,
        path,
        capturedAt,
        geo,
        device,
        priority,
        sourceUrl: CAPTURE_URLS[slug]?.[cat] ?? null,
        notes:     entry.notes ?? '',
        rank,
      });
    }
  }

  return { errors, warnings, info, exchangeEntries };
}

// ── Coverage calculator ───────────────────────────────────────────────────────

function calcCoverage(entries) {
  const bySlug = {};

  for (const e of entries) {
    if (!bySlug[e.slug]) {
      bySlug[e.slug] = {
        slug:       e.slug,
        priority:   e.priority,
        rank:       e.rank,
        total:      0,
        applicable: 0,
        available:  0,
        missing:    0,
        outdated:   0,
        notApplicable: 0,
        missingCategories: [],
      };
    }
    const rec = bySlug[e.slug];
    rec.total++;
    if (e.status === 'not_applicable') {
      rec.notApplicable++;
    } else {
      rec.applicable++;
      if (e.status === 'available') rec.available++;
      else if (e.status === 'outdated') rec.outdated++;
      else rec.missing++;
    }
    // placeholder_rendered = entries that show ScreenshotPlaceholder in production
    // = applicable, non-available (missing / needs_manual_capture / outdated / archived)
    if (
      e.status !== 'not_applicable' &&
      e.status !== 'available'
    ) {
      rec.placeholder = (rec.placeholder ?? 0) + 1;
    }
    if (e.status === 'missing' || e.status === 'needs_manual_capture') {
      rec.missingCategories.push(e.category);
    }
  }

  return Object.values(bySlug)
    .sort((a, b) => a.rank - b.rank)
    .map(r => ({
      ...r,
      coveragePct: r.applicable > 0
        ? Math.round((r.available / r.applicable) * 100)
        : 0,
    }));
}

// ── Priority capture queue ────────────────────────────────────────────────────

function buildCaptureQueue(entries) {
  return entries
    .filter(e => e.status === 'missing' || e.status === 'needs_manual_capture' || e.status === 'outdated')
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      // Within same exchange: registration first, fees/kyc second
      const catOrder = { registration: 0, kyc: 1, fees: 2, bonus: 3, deposit: 4, spot: 5, futures: 6, p2p: 7, mobile_app: 8, proof_of_reserves: 9 };
      return (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99);
    });
}

// ── Report builders ───────────────────────────────────────────────────────────

const NOW = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

function buildMarkdown({ errors, warnings, coverage, captureQueue, entries }) {
  const lines = [];
  const totalApplicable = coverage.reduce((s, r) => s + r.applicable, 0);
  const totalAvailable  = coverage.reduce((s, r) => s + r.available, 0);
  const totalMissing    = coverage.reduce((s, r) => s + r.missing, 0);
  const totalOutdated   = coverage.reduce((s, r) => s + r.outdated, 0);
  const totalPlaceholder = coverage.reduce((s, r) => s + (r.placeholder ?? 0), 0);
  const overallPct      = totalApplicable > 0
    ? Math.round((totalAvailable / totalApplicable) * 100) : 0;

  lines.push(`# Exchange Screenshot Report`);
  lines.push(`*Generated: ${NOW}*`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Exchanges | ${coverage.length} |`);
  lines.push(`| Total applicable slots | ${totalApplicable} |`);
  lines.push(`| Available (captured) | ${totalAvailable} |`);
  lines.push(`| Missing / pending | ${totalMissing} |`);
  lines.push(`| Outdated | ${totalOutdated} |`);
  lines.push(`| Placeholder-rendered | ${totalPlaceholder} |`);
  lines.push(`| Overall coverage | **${overallPct}%** |`);
  lines.push(`| CI errors | ${errors.length} |`);
  lines.push(`| Warnings | ${warnings.length} |`);
  lines.push('');

  if (errors.length > 0) {
    lines.push(`## 🔴 CI Errors (${errors.length})`);
    lines.push('');
    lines.push('These issues will fail CI. Fix before deploying.');
    lines.push('');
    for (const e of errors) lines.push(`- \`${e}\``);
    lines.push('');
  }

  lines.push(`## Per-Exchange Coverage`);
  lines.push('');
  lines.push(`| Priority | Exchange | Coverage | Available | Applicable | Missing | N/A |`);
  lines.push(`|----------|----------|----------|-----------|------------|---------|-----|`);
  for (const r of coverage) {
    const pct  = r.coveragePct;
    const icon = pct === 100 ? '✅' : pct >= 50 ? '🟡' : pct > 0 ? '🟠' : '🔴';
    lines.push(`| ${r.priority} | ${r.slug} | ${icon} ${pct}% | ${r.available} | ${r.applicable} | ${r.missing} | ${r.notApplicable} |`);
  }
  lines.push('');

  lines.push(`## Missing Screenshots`);
  lines.push('');
  const missingEntries = entries.filter(e => e.status === 'missing' || e.status === 'needs_manual_capture');
  if (missingEntries.length === 0) {
    lines.push('✅ All applicable screenshots captured.');
  } else {
    lines.push(`${missingEntries.length} screenshots pending capture:`);
    lines.push('');
    lines.push(`| Priority | Exchange | Category | Device | Source URL |`);
    lines.push(`|----------|----------|----------|--------|------------|`);
    for (const e of missingEntries.slice(0, 60)) {
      const url = e.sourceUrl ? `[capture](${e.sourceUrl})` : '—';
      lines.push(`| ${e.priority} | ${e.slug} | ${e.category} | ${e.device} | ${url} |`);
    }
    if (missingEntries.length > 60) {
      lines.push(`\n*… and ${missingEntries.length - 60} more.*`);
    }
  }
  lines.push('');

  const outdatedEntries = entries.filter(e => e.status === 'outdated');
  if (outdatedEntries.length > 0) {
    lines.push(`## Outdated Screenshots`);
    lines.push('');
    lines.push(`| Exchange | Category | Captured At |`);
    lines.push(`|----------|----------|-------------|`);
    for (const e of outdatedEntries) {
      lines.push(`| ${e.slug} | ${e.category} | ${e.capturedAt ?? '—'} |`);
    }
    lines.push('');
  }

  lines.push(`## Priority Capture Queue`);
  lines.push('');
  lines.push('Recommended capture order (highest-priority exchanges first, then critical categories):');
  lines.push('');
  lines.push(`| # | Priority | Exchange | Category | Device | URL |`);
  lines.push(`|---|----------|----------|----------|--------|-----|`);
  for (let i = 0; i < Math.min(captureQueue.length, 40); i++) {
    const e = captureQueue[i];
    const url = e.sourceUrl ? `[→](${e.sourceUrl})` : '—';
    lines.push(`| ${i + 1} | ${e.priority} | ${e.slug} | ${e.category} | ${e.device} | ${url} |`);
  }
  if (captureQueue.length > 40) {
    lines.push(`\n*… and ${captureQueue.length - 40} more in the queue.*`);
  }
  lines.push('');

  if (warnings.length > 0) {
    lines.push(`## Warnings (${warnings.length})`);
    lines.push('');
    lines.push('Warnings do not fail CI but should be reviewed periodically.');
    lines.push('');
    for (const w of warnings.slice(0, 50)) lines.push(`- ${w}`);
    if (warnings.length > 50) lines.push(`- *… and ${warnings.length - 50} more*`);
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`*Naming convention: \`public/screenshots/{exchange}/{category}/{geo}-{device}-YYYY-MM.webp\`*`);
  lines.push(`*Run \`npm run screenshots:report\` to regenerate.*`);

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const registry     = loadEvidence();
  const { errors, warnings, exchangeEntries } = auditEvidence(registry);
  const coverage     = calcCoverage(exchangeEntries);
  const captureQueue = buildCaptureQueue(exchangeEntries);

  const totalApplicable  = coverage.reduce((s, r) => s + r.applicable, 0);
  const totalAvailable   = coverage.reduce((s, r) => s + r.available, 0);
  const totalMissing     = coverage.reduce((s, r) => s + r.missing, 0);
  const totalOutdated    = coverage.reduce((s, r) => s + r.outdated, 0);
  const totalPlaceholder = coverage.reduce((s, r) => s + (r.placeholder ?? 0), 0);
  const overallPct       = totalApplicable > 0
    ? Math.round((totalAvailable / totalApplicable) * 100) : 0;

  // JSON report object
  const jsonReport = {
    generatedAt:   NOW,
    stats: {
      exchanges:           coverage.length,
      applicable:          totalApplicable,
      available:           totalAvailable,
      missing:             totalMissing,
      outdated:            totalOutdated,
      placeholder_rendered: totalPlaceholder,
      coveragePct:         overallPct,
      errors:              errors.length,
      warnings:            warnings.length,
    },
    coverage,
    captureQueue: captureQueue.slice(0, 40).map(e => ({
      slug: e.slug, category: e.category, priority: e.priority,
      device: e.device, status: e.status, sourceUrl: e.sourceUrl,
    })),
    errors,
    warnings,
  };

  if (JSON_MODE && !WRITE_MODE) {
    console.log(JSON.stringify(jsonReport, null, 2));
    process.exit(errors.length > 0 && FAIL_ON_ERRORS ? 1 : 0);
    return;
  }

  if (WRITE_MODE) {
    if (!existsSync(REPORTS)) mkdirSync(REPORTS, { recursive: true });
    const mdPath   = join(REPORTS, 'exchange-screenshot-report.md');
    const jsonPath = join(REPORTS, 'exchange-screenshot-report.json');
    writeFileSync(mdPath,   buildMarkdown({ errors, warnings, coverage, captureQueue, entries: exchangeEntries }), 'utf8');
    writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');
    console.log(`Written: reports/exchange-screenshot-report.md`);
    console.log(`Written: reports/exchange-screenshot-report.json`);
  }

  // Console summary
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Exchange Screenshot Audit');
  console.log(`  ${NOW}`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Exchanges   : ${coverage.length}`);
  console.log(`  Applicable  : ${totalApplicable}  slots`);
  console.log(`  Available   : ${totalAvailable}   (${overallPct}% coverage)`);
  console.log(`  Missing     : ${totalMissing}   (warnings — not CI errors)`);
  console.log(`  Outdated    : ${totalOutdated}`);
  console.log(`  Placeholder : ${totalPlaceholder}  (rendered as ScreenshotPlaceholder in production)`);
  console.log(`  CI Errors   : ${errors.length}   (broken available screenshots)`);
  console.log(`  Warnings    : ${warnings.length}`);
  console.log('──────────────────────────────────────────────────────────────');

  if (errors.length > 0) {
    console.log('  CI ERRORS:');
    for (const e of errors) console.log(`    ✗ ${e}`);
    console.log('');
  }

  // Per-exchange table
  if (VERBOSE) {
    console.log(`  ${'Exchange'.padEnd(12)} ${'Priority'.padEnd(9)} ${'Coverage'.padEnd(9)} Available/Applicable`);
    console.log(`  ${'─'.repeat(55)}`);
    for (const r of coverage) {
      const bar = r.coveragePct === 100 ? '✅' : r.coveragePct >= 50 ? '🟡' : r.coveragePct > 0 ? '🟠' : '🔴';
      console.log(`  ${r.slug.padEnd(12)} ${r.priority.padEnd(9)} ${bar} ${String(r.coveragePct).padStart(3)}%    ${r.available}/${r.applicable}`);
    }
    console.log('');
  }

  if (captureQueue.length > 0) {
    console.log(`  Next ${Math.min(10, captureQueue.length)} captures (priority order):`);
    for (const e of captureQueue.slice(0, 10)) {
      console.log(`    ${e.priority}  ${e.slug.padEnd(12)} ${e.category.padEnd(18)} device:${e.device}`);
    }
    if (captureQueue.length > 10) {
      console.log(`    … and ${captureQueue.length - 10} more in the queue`);
    }
  }

  console.log('══════════════════════════════════════════════════════════════');
  console.log('');

  if (errors.length > 0 && FAIL_ON_ERRORS) {
    console.error(`FAIL: ${errors.length} CI error(s) found — broken available screenshot(s).`);
    process.exit(1);
  }

  // Exit 0 even if there are warnings — missing screenshots are expected at this stage
  process.exit(0);
}

main().catch(err => {
  console.error('Screenshot audit failed:', err);
  process.exit(1);
});
