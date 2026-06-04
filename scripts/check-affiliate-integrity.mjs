#!/usr/bin/env node
/**
 * check-affiliate-integrity.mjs
 * Affiliate routing integrity gate for CryptoBonusWorld.
 *
 * Validates the affiliate routing system by cross-checking:
 *   - exchanges.json  (runtime data, what /go/[exchange] actually imports)
 *   - src/data/affiliate-links.ts  (canonical TypeScript registry)
 *
 * Exit codes:
 *   0  — PASS (no fatals, no warnings — or warnings suppressed)
 *   1  — PASS WITH WARNINGS
 *   2  — FAIL (fatal issues found; or --fail-on-issues and any issue exists)
 *
 * Flags:
 *   --verbose            Print per-exchange detail even when all OK
 *   --fail-on-issues     Exit 2 if any warning-level issue found
 *   --json               Write reports/affiliate-integrity.json
 *   --exchange <slug>    Validate a single exchange only
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── CLI flags ────────────────────────────────────────────────────────────────
const args           = process.argv.slice(2);
const VERBOSE        = args.includes('--verbose');
const FAIL_ON_ISSUES = args.includes('--fail-on-issues');
const JSON_OUTPUT    = args.includes('--json');
const exchangeIdx    = args.indexOf('--exchange');
const FILTER_SLUG    = exchangeIdx !== -1 ? args[exchangeIdx + 1] : null;

// ─── Immutable baselines (NEVER change without explicit approval) ─────────────
const IMMUTABLE_LINKS = {
  bybit: 'https://partner.bybit.com/b/CRYPTOBONUSW',
  mexc:  'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus',
};

// ─── Known-clean URLs for non-affiliate partners ──────────────────────────────
const CLEAN_URLS = {
  lbank:    'https://www.lbank.com/',
  coinbase: 'https://www.coinbase.com/',
};

// ─── Exchanges that must have a real (non-placeholder) affiliate default ──────
const FULL_PARTNER_SLUGS = new Set([
  'bybit', 'binance', 'mexc', 'okx', 'bitget',
  'bingx', 'gate-io', 'kucoin', 'htx', 'coinex',
  'phemex', 'bitunix',
]);

// GEO codes expected in exchanges.json geo routing
const GEO_CODES = ['tr', 'in', 'id', 'ng', 'br', 'vn', 'ph'];

// Known-good domain allowlist (for HTTP/HTTPS validation, not whitelist enforcement)
const EXPECTED_AFFILIATE_DOMAINS = new Set([
  'partner.bybit.com',
  'www.mexc.com',
  'accounts.binance.com',
  'www.binance.com',
  'okx.com',
  'www.okx.com',
  'partner.bitget.com',
  'www.bitget.com',
  'bingx.com',
  'www.bingx.com',
  'bingxdao.com',        // BingX affiliate partner domain
  'www.gate.io',
  'www.gate.com',        // Gate.io rebranded to gate.com
  'gate.io',
  'www.kucoin.com',
  'www.htx.com',
  'www.htx.com.ph',      // HTX Philippines regional affiliate domain
  'www.coinex.com',
  'phemex.com',
  'www.phemex.com',
  'www.bitunix.com',
  'www.lbank.com',
  'www.coinbase.com',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isPlaceholder(url) {
  if (!url) return true;
  return url === '#' || url === '' || url === 'https://example.com' || url === 'TBD' || url === 'PLACEHOLDER';
}

function isValidHttps(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// ─── Load exchanges.json ───────────────────────────────────────────────────────
const exchangesJsonPath = path.join(ROOT, 'src', 'data', 'exchanges.json');
let exchangesData;
try {
  exchangesData = JSON.parse(fs.readFileSync(exchangesJsonPath, 'utf8'));
} catch (err) {
  console.error(`FATAL: Cannot read exchanges.json — ${err.message}`);
  process.exit(2);
}

if (!Array.isArray(exchangesData)) {
  console.error('FATAL: exchanges.json is not an array');
  process.exit(2);
}

// ─── Parse affiliate-links.ts for canonical registry data ────────────────────
// We extract the slug and partnerStatus from the TypeScript source using regex.
// This avoids dynamic imports of TypeScript files while still cross-referencing
// the canonical registry.
const affiliateLinksPath = path.join(ROOT, 'src', 'data', 'affiliate-links.ts');
let affiliateLinksTs = '';
const canonicalRegistry = {}; // slug → { partnerStatus, primaryLinkType, affiliateUrl }

try {
  affiliateLinksTs = fs.readFileSync(affiliateLinksPath, 'utf8');
} catch (err) {
  console.warn(`WARNING: Cannot read affiliate-links.ts — ${err.message}`);
}

if (affiliateLinksTs) {
  // Extract each entry block: { slug: 'xxx', ... partnerStatus: 'yyy', ...  links: { ... affiliate: 'url' ... } }
  // We use a simple approach: find all slug+partnerStatus pairs
  const slugPattern      = /slug:\s*['"]([^'"]+)['"]/g;
  const statusPattern    = /partnerStatus:\s*['"]([^'"]+)['"]/g;
  const primaryTypePattern = /primaryLinkType:\s*['"]([^'"]+)['"]/g;

  const slugMatches    = [...affiliateLinksTs.matchAll(slugPattern)].map(m => m[1]);
  const statusMatches  = [...affiliateLinksTs.matchAll(statusPattern)].map(m => m[1]);
  const typeMatches    = [...affiliateLinksTs.matchAll(primaryTypePattern)].map(m => m[1]);

  // Also extract affiliate URLs per entry block
  // Split on slug: declarations to get per-entry sections
  const entryBlocks = affiliateLinksTs.split(/(?=\{\s*\n?\s*slug:\s*['"])/g).slice(1);

  for (let i = 0; i < slugMatches.length; i++) {
    const slug   = slugMatches[i];
    const status = statusMatches[i] || 'unknown';
    const type   = typeMatches[i] || 'unknown';

    // Try to extract affiliate URL from the entry block
    let affiliateUrl = null;
    if (entryBlocks[i]) {
      const affMatch = entryBlocks[i].match(/affiliate:\s*['"]([^'"]+)['"]/);
      if (affMatch) affiliateUrl = affMatch[1];
    }

    canonicalRegistry[slug] = { partnerStatus: status, primaryLinkType: type, affiliateUrl };
  }
}

const canonicalCount = Object.keys(canonicalRegistry).length;

// ─── Validation state ─────────────────────────────────────────────────────────
const results = [];
let totalFatals   = 0;
let totalWarnings = 0;
let totalInfos    = 0;

const SEVERITY = { FATAL: 'FATAL', WARN: 'WARN', INFO: 'INFO' };

function makeResult(slug) {
  return {
    slug,
    status: 'ok',
    issues: [],
    defaultUrl: null,
    geoUrlCount: 0,
    geoPlaceholderCount: 0,
    partnerStatus: null,
    immutableCheckPassed: null,
  };
}

function addIssue(result, severity, code, message) {
  result.issues.push({ severity, code, message });
  if (severity === SEVERITY.FATAL) {
    result.status = 'fatal';
    totalFatals++;
  } else if (severity === SEVERITY.WARN) {
    if (result.status !== 'fatal') result.status = 'warn';
    totalWarnings++;
  } else {
    totalInfos++;
  }
}

// ─── Validate each exchange ───────────────────────────────────────────────────
for (const ex of exchangesData) {
  const slug = ex.slug;
  if (!slug) {
    totalFatals++;
    results.push({ slug: '(missing)', status: 'fatal', issues: [
      { severity: SEVERITY.FATAL, code: 'MISSING_SLUG', message: 'Exchange entry has no slug field' }
    ] });
    continue;
  }

  if (FILTER_SLUG && slug !== FILTER_SLUG) continue;

  const result = makeResult(slug);

  // ── 1. Default URL checks ────────────────────────────────────────────────
  const defaultUrl = ex.affiliateLinks?.default;
  result.defaultUrl = defaultUrl ?? null;

  if (!defaultUrl) {
    addIssue(result, SEVERITY.FATAL, 'MISSING_DEFAULT',
      `affiliateLinks.default is missing`);
  } else if (isPlaceholder(defaultUrl)) {
    if (FULL_PARTNER_SLUGS.has(slug)) {
      addIssue(result, SEVERITY.FATAL, 'PLACEHOLDER_DEFAULT',
        `Full partner has placeholder default URL: "${defaultUrl}"`);
    } else {
      addIssue(result, SEVERITY.INFO, 'PLACEHOLDER_DEFAULT_EXPECTED',
        `Non-full partner has placeholder default URL: "${defaultUrl}" (expected)`);
    }
  } else {
    // Non-placeholder default: validate HTTPS
    if (!isValidHttps(defaultUrl)) {
      addIssue(result, SEVERITY.FATAL, 'DEFAULT_NOT_HTTPS',
        `Default URL is not HTTPS: "${defaultUrl}"`);
    } else {
      // Domain sanity check (warning only — new partners can have new domains)
      const domain = getDomain(defaultUrl);
      if (domain && !EXPECTED_AFFILIATE_DOMAINS.has(domain)) {
        addIssue(result, SEVERITY.WARN, 'UNEXPECTED_DOMAIN',
          `Default URL domain not in allowlist: "${domain}" — verify this is intentional`);
      }
    }

    // Immutability check
    if (IMMUTABLE_LINKS[slug]) {
      if (defaultUrl !== IMMUTABLE_LINKS[slug]) {
        addIssue(result, SEVERITY.FATAL, 'IMMUTABLE_VIOLATION',
          `IMMUTABLE LINK CHANGED! Expected: "${IMMUTABLE_LINKS[slug]}" Got: "${defaultUrl}"`);
        result.immutableCheckPassed = false;
      } else {
        result.immutableCheckPassed = true;
      }
    }
  }

  // ── 2. GEO URL checks ────────────────────────────────────────────────────
  const geoLinks = ex.affiliateLinks?.geo ?? {};
  let geoReal = 0;
  let geoPlaceholder = 0;

  for (const code of GEO_CODES) {
    const geoUrl = geoLinks[code];
    if (geoUrl === undefined || geoUrl === null) {
      // Missing geo entry — warn for full partners only
      if (FULL_PARTNER_SLUGS.has(slug)) {
        addIssue(result, SEVERITY.WARN, 'MISSING_GEO_ENTRY',
          `GEO code "${code}" has no entry in affiliateLinks.geo`);
      }
    } else if (isPlaceholder(geoUrl)) {
      geoPlaceholder++;
      // Placeholder geo is expected/intentional for most exchanges — INFO only
      // (bypass for bybit which has all 7 real URLs)
      if (slug === 'bybit') {
        addIssue(result, SEVERITY.FATAL, 'BYBIT_GEO_PLACEHOLDER',
          `Bybit GEO "${code}" should have a real URL but is placeholder: "${geoUrl}"`);
      }
      // else: INFO — don't clutter output for 12 exchanges × 7 geo codes = 84 expected placeholders
    } else {
      geoReal++;
      // Real GEO URL — validate HTTPS
      if (!isValidHttps(geoUrl)) {
        addIssue(result, SEVERITY.FATAL, 'GEO_NOT_HTTPS',
          `GEO "${code}" URL is not HTTPS: "${geoUrl}"`);
      }
    }
  }

  result.geoUrlCount         = geoReal;
  result.geoPlaceholderCount = geoPlaceholder;

  // Warn if full partner has ZERO real geo URLs and is NOT in expected-no-geo set
  const noGeoExpected = new Set(['coinbase']);
  if (FULL_PARTNER_SLUGS.has(slug) && geoReal === 0 && !noGeoExpected.has(slug)) {
    // This is currently expected for 11 of 12 full partners (only bybit has real geo)
    // Report as INFO so it shows up in verbose mode without polluting normal output
    addIssue(result, SEVERITY.INFO, 'NO_GEO_URLS',
      `All GEO codes are placeholder — no geo-targeted affiliate links configured`);
  }

  // ── 3. Legacy affiliateUrl field check ───────────────────────────────────
  if (ex.affiliateUrl !== undefined) {
    const legacyUrl = ex.affiliateUrl;
    if (!isPlaceholder(legacyUrl) && !isValidHttps(legacyUrl)) {
      addIssue(result, SEVERITY.WARN, 'LEGACY_URL_NOT_HTTPS',
        `Legacy affiliateUrl field is not HTTPS: "${legacyUrl}"`);
    }
    // Cross-check: if both legacy and default exist and differ, warn
    if (!isPlaceholder(legacyUrl) && !isPlaceholder(defaultUrl) && legacyUrl !== defaultUrl) {
      addIssue(result, SEVERITY.WARN, 'LEGACY_DEFAULT_MISMATCH',
        `Legacy affiliateUrl differs from affiliateLinks.default — verify which is authoritative`);
    }
  }

  // ── 4. Cross-reference with canonical affiliate-links.ts ─────────────────
  if (canonicalCount > 0) {
    const canonical = canonicalRegistry[slug];
    if (!canonical) {
      addIssue(result, SEVERITY.WARN, 'NOT_IN_CANONICAL_REGISTRY',
        `Exchange "${slug}" is in exchanges.json but missing from affiliate-links.ts`);
    } else {
      result.partnerStatus = canonical.partnerStatus;

      // If canonical has a real affiliate URL, check it matches the default.
      // Exception: if this slug has an immutable baseline and it already passed,
      // the runtime URL is definitively correct — suppress the mismatch as INFO only.
      if (canonical.affiliateUrl && !isPlaceholder(defaultUrl) &&
          canonical.affiliateUrl !== defaultUrl) {
        // Treat as INFO (not WARN) when immutable check already validated the URL,
        // because the canonical registry may store a base URL without query params.
        const severity = IMMUTABLE_LINKS[slug] ? SEVERITY.INFO : SEVERITY.WARN;
        addIssue(result, severity, 'CANONICAL_MISMATCH',
          `affiliate-links.ts affiliate URL differs from exchanges.json default — ` +
          `canonical: "${canonical.affiliateUrl}" runtime: "${defaultUrl}"`);
      }

      // Pending partner with real affiliate URL is suspicious
      if (canonical.partnerStatus === 'pending' && !isPlaceholder(defaultUrl) &&
          !CLEAN_URLS[slug]) {
        addIssue(result, SEVERITY.WARN, 'PENDING_HAS_AFFILIATE_URL',
          `Partner status is "pending" but default URL looks like an affiliate URL: "${defaultUrl}"`);
      }
    }
  }

  results.push(result);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
const totalExchanges = results.length;
const fatalCount   = results.filter(r => r.status === 'fatal').length;
const warnCount    = results.filter(r => r.status === 'warn').length;
const okCount      = results.filter(r => r.status === 'ok').length;

const immutableChecks = Object.keys(IMMUTABLE_LINKS).filter(slug => {
  const r = results.find(x => x.slug === slug);
  return r && r.immutableCheckPassed === true;
}).length;

// ─── Console output ───────────────────────────────────────────────────────────
const BOLD  = '\x1b[1m';
const RED   = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BLUE  = '\x1b[34m';
const RESET = '\x1b[0m';

function severityColor(s) {
  if (s === SEVERITY.FATAL) return RED + BOLD;
  if (s === SEVERITY.WARN)  return YELLOW;
  return BLUE;
}

console.log('');
console.log(`${BOLD}══════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  Affiliate Routing Integrity Gate${RESET}`);
console.log(`${BOLD}══════════════════════════════════════════════════════${RESET}`);
console.log(`  Checked:  ${totalExchanges} exchange(s)  |  Source: exchanges.json`);
if (canonicalCount > 0) {
  console.log(`  Registry: ${canonicalCount} entries in affiliate-links.ts`);
}
console.log('');

for (const result of results) {
  const hasIssues = result.issues.filter(i => i.severity !== SEVERITY.INFO).length > 0;
  const hasInfo   = result.issues.filter(i => i.severity === SEVERITY.INFO).length > 0;

  if (result.status === 'ok' && !VERBOSE) continue;

  // Header line
  let statusIcon  = result.status === 'ok' ? `${GREEN}✓${RESET}` : '';
  if (result.status === 'warn')  statusIcon = `${YELLOW}⚠${RESET}`;
  if (result.status === 'fatal') statusIcon = `${RED}✗${RESET}`;

  const immutableBadge = result.immutableCheckPassed === true
    ? ` ${GREEN}[IMMUTABLE ✓]${RESET}` : '';
  const geoInfo = result.geoUrlCount > 0
    ? ` geo:${result.geoUrlCount}/${GEO_CODES.length}` : '';
  const partnerBadge = result.partnerStatus
    ? ` [${result.partnerStatus}]` : '';

  console.log(`  ${statusIcon} ${BOLD}${result.slug}${RESET}${partnerBadge}${immutableBadge}${geoInfo}`);

  if (VERBOSE && result.defaultUrl && !isPlaceholder(result.defaultUrl)) {
    console.log(`       default: ${result.defaultUrl}`);
  }

  for (const issue of result.issues) {
    if (issue.severity === SEVERITY.INFO && !VERBOSE) continue;
    const color = severityColor(issue.severity);
    console.log(`     ${color}[${issue.severity}]${RESET} ${issue.code}: ${issue.message}`);
  }
}

// ─── Immutable baseline summary ───────────────────────────────────────────────
console.log('');
console.log(`${BOLD}  Immutable Links:${RESET}`);
for (const [slug, expectedUrl] of Object.entries(IMMUTABLE_LINKS)) {
  const r = results.find(x => x.slug === slug);
  if (!r) {
    console.log(`    ${RED}✗${RESET} ${slug} — not found in exchanges.json`);
    continue;
  }
  if (r.immutableCheckPassed === true) {
    console.log(`    ${GREEN}✓${RESET} ${slug} — matches baseline`);
  } else if (r.immutableCheckPassed === false) {
    console.log(`    ${RED}✗${RESET} ${slug} — MISMATCH (see FATAL above)`);
  } else {
    console.log(`    ${YELLOW}?${RESET} ${slug} — unchecked (default URL missing or placeholder)`);
  }
}

// ─── Final verdict ────────────────────────────────────────────────────────────
console.log('');
console.log(`${BOLD}──────────────────────────────────────────────────────${RESET}`);
console.log(`  Fatal:    ${fatalCount > 0 ? RED + BOLD : GREEN}${fatalCount}${RESET}`);
console.log(`  Warnings: ${warnCount > 0 ? YELLOW : GREEN}${warnCount}${RESET}`);
console.log(`  Infos:    ${totalInfos}`);
console.log(`  Clean:    ${okCount}/${totalExchanges}`);
console.log(`${BOLD}──────────────────────────────────────────────────────${RESET}`);

let exitCode = 0;
if (totalFatals > 0) {
  exitCode = 2;
  console.log(`\n${RED}${BOLD}  RESULT: FAIL — ${totalFatals} fatal issue(s) found${RESET}\n`);
} else if (totalWarnings > 0) {
  exitCode = FAIL_ON_ISSUES ? 2 : 1;
  const verdict = FAIL_ON_ISSUES ? 'FAIL' : 'PASS WITH WARNINGS';
  console.log(`\n${YELLOW}  RESULT: ${verdict} — ${totalWarnings} warning(s)${RESET}\n`);
} else {
  console.log(`\n${GREEN}${BOLD}  RESULT: PASS — affiliate routing integrity verified${RESET}\n`);
}

// ─── JSON output ─────────────────────────────────────────────────────────────
if (JSON_OUTPUT) {
  const reportsDir = path.join(ROOT, 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalExchanges,
      fatalCount,
      warnCount,
      okCount,
      totalFatals,
      totalWarnings,
      totalInfos,
      immutableBaselinesPassed: immutableChecks,
      immutableBaselinesTotal: Object.keys(IMMUTABLE_LINKS).length,
      canonicalRegistryEntries: canonicalCount,
    },
    immutableLinks: Object.fromEntries(
      Object.entries(IMMUTABLE_LINKS).map(([slug, url]) => {
        const r = results.find(x => x.slug === slug);
        return [slug, {
          expected: url,
          actual: r?.defaultUrl ?? null,
          passed: r?.immutableCheckPassed ?? null,
        }];
      })
    ),
    results: results.map(r => ({
      slug:                r.slug,
      status:              r.status,
      partnerStatus:       r.partnerStatus,
      defaultUrl:          r.defaultUrl,
      geoUrlCount:         r.geoUrlCount,
      geoPlaceholderCount: r.geoPlaceholderCount,
      immutableCheckPassed: r.immutableCheckPassed,
      issues:              r.issues,
    })),
  };

  const jsonPath = path.join(reportsDir, 'affiliate-integrity.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`  Report written: ${jsonPath}\n`);
}

process.exit(exitCode);
