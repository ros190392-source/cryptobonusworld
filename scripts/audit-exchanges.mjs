/**
 * CryptoBonusWorld — Exchange Data Audit Script
 *
 * Standalone Node.js ESM script. Reads exchanges.json and runs a full
 * data quality audit without requiring the TypeScript build.
 *
 * Usage:
 *   node scripts/audit-exchanges.mjs
 *   node scripts/audit-exchanges.mjs --json         (output raw JSON report)
 *   node scripts/audit-exchanges.mjs --fix-dates    (preview date-touch changes)
 *
 * Exit codes:
 *   0 — all exchanges pass (warnings are OK)
 *   1 — one or more exchanges have critical schema errors
 *
 * Logic mirrors src/utils/dataManager.ts — keep in sync when schema changes.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dir, '../src/data/exchanges.json');

// ── Config ────────────────────────────────────────────────────────────────────

const WARN_DAYS   = 14;
const STALE_DAYS  = 30;
const PLACEHOLDER = '#';
const TARGET_GEOS = ['tr', 'in', 'id', 'ng', 'br', 'vn', 'ph'];

const COMPLETENESS_WEIGHTS = {
  affiliateUrl_live:  20,
  geoUrls_any:        15,
  promoCode_any:      10,
  editorNote:          8,
  licences:            7,
  termsUrl:            8,
  longDescription:     8,
  riskNotes:           7,
  bonusExpiry:         7,
  sources_any:        10,
};

// ── ANSI colours (auto-disabled when not a TTY) ───────────────────────────────

const isTTY = process.stdout.isTTY;
const c = {
  reset:  isTTY ? '\x1b[0m'  : '',
  bold:   isTTY ? '\x1b[1m'  : '',
  dim:    isTTY ? '\x1b[2m'  : '',
  red:    isTTY ? '\x1b[31m' : '',
  green:  isTTY ? '\x1b[32m' : '',
  yellow: isTTY ? '\x1b[33m' : '',
  blue:   isTTY ? '\x1b[34m' : '',
  cyan:   isTTY ? '\x1b[36m' : '',
  white:  isTTY ? '\x1b[97m' : '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isReal(url) {
  return Boolean(url && url.trim() && url !== PLACEHOLDER && url.startsWith('http'));
}

function getDataAge(dateStr) {
  const ms = Date.parse(dateStr);
  if (isNaN(ms)) return -1;
  return Math.floor((Date.now() - ms) / 86_400_000);
}

function getFreshnessStatus(dateStr) {
  const age = getDataAge(dateStr);
  if (age < 0)          return 'invalid';
  if (age <= WARN_DAYS)  return 'fresh';
  if (age <= STALE_DAYS) return 'warn';
  return 'stale';
}

function getGeoFilled(ex) {
  const geo = ex.affiliateLinks?.geo ?? {};
  return TARGET_GEOS.filter(code => isReal(geo[code]));
}

function hasLiveUrl(ex) {
  return isReal(ex.affiliateLinks?.default) || isReal(ex.affiliateUrl);
}

function getActivePromoCodes(ex) {
  const today = Date.now();
  return (ex.promoCodes ?? []).filter(c => {
    if (!c.code?.trim()) return false;
    if (c.expiresAt && Date.parse(c.expiresAt) <= today) return false;
    return true;
  });
}

function getCompleteness(ex) {
  const criteria = {
    affiliateUrl_live: () => hasLiveUrl(ex),
    geoUrls_any:       () => getGeoFilled(ex).length > 0,
    promoCode_any:     () => getActivePromoCodes(ex).length > 0,
    editorNote:        () => Boolean(ex.editorNote?.trim()),
    licences:          () => (ex.licences?.length ?? 0) > 0,
    termsUrl:          () => isReal(ex.termsUrl),
    longDescription:   () => Boolean(ex.longDescription?.trim()),
    riskNotes:         () => Boolean(ex.riskNotes?.trim()),
    bonusExpiry:       () => Boolean(ex.bonusExpiry?.days),
    sources_any:       () => (ex.sources?.length ?? 0) > 0,
  };
  let score = 0;
  const missing = [];
  for (const [key, check] of Object.entries(criteria)) {
    if (check()) {
      score += COMPLETENESS_WEIGHTS[key] ?? 0;
    } else {
      missing.push(key.replace(/_/g, ' ').replace(' any', ''));
    }
  }
  return { score, missing };
}

function validateExchange(ex) {
  const errors = [];
  const warnings = [];

  // Required field presence
  const required = [
    'name','slug','logo','rating','topChoice',
    'bonusTitle','bonusAmount','bonusCurrency','bonusTypes','bonusTiers',
    'kycRequired','depositRequired','futuresRequired','minDeposit','tradingVolumeRequired',
    'affiliateUrl','affiliateLinks','commissionType','promoCode','promoCodes',
    'termsUrl','countries','excludedCountries','paymentMethods',
    'founded','users','headquarters','licences','featureBadges',
    'pros','cons','requirements','riskNotes','shortDescription','bestFor','longDescription',
    'editorNote','lastVerified','updatedAt','status',
  ];
  for (const f of required) {
    if (!(f in ex) || ex[f] === undefined || ex[f] === null) {
      errors.push(`MISSING required field: ${f}`);
    }
  }

  // Type / value checks
  if (typeof ex.rating === 'number' && (ex.rating < 0 || ex.rating > 10)) {
    errors.push(`rating out of range: ${ex.rating}`);
  }
  if (typeof ex.bonusAmount === 'number' && ex.bonusAmount < 0) {
    errors.push(`bonusAmount must be >= 0`);
  }
  if (typeof ex.lastVerified === 'string' && isNaN(Date.parse(ex.lastVerified))) {
    errors.push(`lastVerified invalid date format: "${ex.lastVerified}"`);
  }
  if (typeof ex.updatedAt === 'string' && isNaN(Date.parse(ex.updatedAt))) {
    errors.push(`updatedAt invalid date format: "${ex.updatedAt}"`);
  }
  const validStatuses = ['active','inactive','review','paused'];
  if (typeof ex.status === 'string' && !validStatuses.includes(ex.status)) {
    errors.push(`unknown status: "${ex.status}"`);
  }
  if (!ex.affiliateLinks?.default && ex.affiliateLinks?.default !== '#') {
    errors.push(`affiliateLinks.default missing`);
  }

  // Soft warnings
  if (!ex.editorNote?.trim())    warnings.push(`editorNote is empty`);
  if (!ex.licences?.length)      warnings.push(`licences is empty`);
  if (!ex.promoCodes?.length)    warnings.push(`promoCodes is empty`);

  // Expired promo codes
  for (const c of (ex.promoCodes ?? [])) {
    if (c.expiresAt && Date.parse(c.expiresAt) <= Date.now()) {
      warnings.push(`promoCode "${c.code}" (${c.region}) expired: ${c.expiresAt}`);
    }
  }

  return { errors, warnings };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');

// Load data
let exchanges;
try {
  exchanges = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
} catch (err) {
  console.error(`${c.red}ERROR: Could not read exchanges.json${c.reset}`);
  console.error(err.message);
  process.exit(1);
}

// Run audit
const results = exchanges.map(ex => {
  const { errors, warnings } = validateExchange(ex);
  const freshness = getFreshnessStatus(ex.lastVerified);
  const age = getDataAge(ex.lastVerified);
  const { score, missing } = getCompleteness(ex);
  const geoFilled = getGeoFilled(ex);
  const geoCoverage = `${geoFilled.length}/${TARGET_GEOS.length}`;
  const liveUrl = hasLiveUrl(ex);
  const activeCodes = getActivePromoCodes(ex);

  return {
    slug: ex.slug,
    name: ex.name,
    status: ex.status,
    freshness,
    ageDays: age,
    completeness: score,
    completenessMax: 100,
    missingItems: missing,
    liveUrl,
    geoCoverage,
    geoFilled: geoFilled.length,
    activeCodes: activeCodes.length,
    errors,
    warnings,
  };
});

// ── JSON output mode ──────────────────────────────────────────────────────────
if (jsonMode) {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      critical: results.filter(r => r.errors.length > 0).length,
      stale: results.filter(r => r.freshness === 'stale').length,
      warn: results.filter(r => r.freshness === 'warn').length,
      withLiveUrl: results.filter(r => r.liveUrl).length,
      avgCompleteness: Math.round(results.reduce((s, r) => s + r.completeness, 0) / results.length),
    },
    results,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.summary.critical > 0 ? 1 : 0);
}

// ── Human-readable output ─────────────────────────────────────────────────────

const totalExchanges = results.length;
const critical  = results.filter(r => r.errors.length > 0).length;
const stale     = results.filter(r => r.freshness === 'stale').length;
const warnAge   = results.filter(r => r.freshness === 'warn').length;
const liveUrls  = results.filter(r => r.liveUrl).length;
const avgComp   = Math.round(results.reduce((s, r) => s + r.completeness, 0) / totalExchanges);

console.log('');
console.log(`${c.bold}${c.white}╔══════════════════════════════════════════════════╗${c.reset}`);
console.log(`${c.bold}${c.white}║   CryptoBonusWorld — Exchange Data Audit          ║${c.reset}`);
console.log(`${c.bold}${c.white}╚══════════════════════════════════════════════════╝${c.reset}`);
console.log(`  ${c.dim}${new Date().toISOString()}${c.reset}`);
console.log('');

// Summary banner
console.log(`${c.bold}SUMMARY${c.reset}`);
console.log(`  Exchanges:       ${c.bold}${totalExchanges}${c.reset}`);
console.log(`  Critical issues: ${critical > 0 ? c.red : c.green}${critical}${c.reset}`);
console.log(`  Stale data:      ${stale > 0 ? c.red : c.green}${stale}${c.reset} ${c.dim}(>${STALE_DAYS}d)${c.reset}`);
console.log(`  Warn (age):      ${warnAge > 0 ? c.yellow : c.green}${warnAge}${c.reset} ${c.dim}(>${WARN_DAYS}d)${c.reset}`);
console.log(`  Live aff. URLs:  ${liveUrls < totalExchanges ? c.yellow : c.green}${liveUrls}/${totalExchanges}${c.reset}`);
console.log(`  Avg completeness:${c.cyan} ${avgComp}%${c.reset}`);
console.log('');

// Per-exchange table
const COL = {
  slug:     12,
  status:    8,
  fresh:     6,
  age:       4,
  comp:      5,
  url:       5,
  geo:       5,
  promo:     6,
};

const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

console.log(`${c.dim}${pad('EXCHANGE', COL.slug)} ${pad('STATUS', COL.status)} ${pad('FRESH', COL.fresh)} ${rpad('AGE', COL.age)} ${rpad('COMP', COL.comp)} ${pad('URL', COL.url)} ${pad('GEO', COL.geo)} ${pad('PROMO', COL.promo)}  ISSUES${c.reset}`);
console.log(`${c.dim}${'─'.repeat(80)}${c.reset}`);

for (const r of results) {
  const freshnessColor =
    r.freshness === 'fresh'   ? c.green :
    r.freshness === 'warn'    ? c.yellow :
    r.freshness === 'stale'   ? c.red :
    c.red;

  const compColor =
    r.completeness >= 70 ? c.green :
    r.completeness >= 45 ? c.yellow :
    c.red;

  const urlIcon  = r.liveUrl ? `${c.green}✓${c.reset}` : `${c.yellow}✗${c.reset}`;
  const geoColor = r.geoFilled === 0 ? c.yellow : r.geoFilled < 5 ? c.yellow : c.green;
  const promoIcon = r.activeCodes > 0 ? `${c.green}✓${c.reset}` : `${c.dim}—${c.reset}`;

  const issueStr = r.errors.length > 0
    ? `${c.red}${r.errors.length} ERR${c.reset}`
    : r.warnings.length > 0
      ? `${c.yellow}${r.warnings.length} warn${c.reset}`
      : `${c.green}OK${c.reset}`;

  const ageStr = r.ageDays < 0 ? 'N/A' : `${r.ageDays}d`;

  console.log(
    `${pad(r.slug, COL.slug)} ` +
    `${pad(r.status, COL.status)} ` +
    `${freshnessColor}${pad(r.freshness, COL.fresh)}${c.reset} ` +
    `${rpad(ageStr, COL.age)} ` +
    `${compColor}${rpad(r.completeness + '%', COL.comp)}${c.reset} ` +
    `${urlIcon}  ${geoColor}${pad(r.geoCoverage, COL.geo)}${c.reset} ${promoIcon}     ${issueStr}`
  );
}

console.log('');

// Per-exchange detail (warnings + missing completeness items)
let detailShown = false;
for (const r of results) {
  if (r.errors.length === 0 && r.warnings.length === 0) continue;
  if (!detailShown) {
    console.log(`${c.bold}DETAIL${c.reset}`);
    detailShown = true;
  }
  console.log(`  ${c.bold}${r.slug}${c.reset}`);
  for (const e of r.errors)   console.log(`    ${c.red}✗ ERR${c.reset}  ${e}`);
  for (const w of r.warnings) console.log(`    ${c.yellow}⚠ WARN${c.reset} ${w}`);
}

if (!detailShown) {
  console.log(`${c.green}No issues to detail.${c.reset}`);
}
console.log('');

// Completeness breakdown — show bottom exchanges
const sorted = [...results].sort((a, b) => a.completeness - b.completeness);
console.log(`${c.bold}COMPLETENESS — bottom exchanges${c.reset}`);
for (const r of sorted.slice(0, 5)) {
  console.log(`  ${pad(r.slug, 12)} ${r.completeness}%  missing: ${c.dim}${r.missingItems.join(', ')}${c.reset}`);
}
console.log('');

// Action items
console.log(`${c.bold}NEXT ACTIONS${c.reset}`);
if (liveUrls < totalExchanges) {
  console.log(`  ${c.yellow}▸${c.reset} Add real affiliate URLs for ${totalExchanges - liveUrls} exchange(s) — biggest revenue gap`);
}
const noGeo = results.filter(r => r.geoFilled === 0).length;
if (noGeo > 0) {
  console.log(`  ${c.yellow}▸${c.reset} Add GEO-specific URLs for ${noGeo} exchange(s) (tr/in/id/ng/br/vn/ph)`);
}
const noPromo = results.filter(r => r.activeCodes === 0).length;
if (noPromo > 0) {
  console.log(`  ${c.yellow}▸${c.reset} Add promo codes for ${noPromo} exchange(s)`);
}
const noEditor = results.filter(r => !r.missingItems.includes ? true : r.missingItems.some(m => m.includes('editorNote'))).length;
if (noEditor > 0) {
  console.log(`  ${c.dim}▸${c.reset} Fill editorNote for ${noEditor} exchange(s) (editorial quality)`);
}
if (stale > 0) {
  console.log(`  ${c.red}▸${c.reset} Re-verify data for ${stale} stale exchange(s) (>${STALE_DAYS} days)`);
}
console.log('');

// Exit code
if (critical > 0) {
  console.log(`${c.red}${c.bold}AUDIT FAILED — ${critical} exchange(s) have critical schema errors.${c.reset}`);
  console.log('');
  process.exit(1);
} else {
  console.log(`${c.green}${c.bold}AUDIT PASSED — no critical issues found.${c.reset}`);
  console.log('');
  process.exit(0);
}
