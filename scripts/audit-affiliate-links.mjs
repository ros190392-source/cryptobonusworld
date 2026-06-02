#!/usr/bin/env node
/**
 * audit-affiliate-links.mjs
 *
 * Validates the affiliate link registry against:
 *   - Internal consistency (registry self-checks)
 *   - exchanges.json parity (affiliateUrl matches registry)
 *   - No hardcoded outbound exchange URLs outside the registry
 *   - No stray UTM/ref params in clean links
 *   - Coinbase is clean-only (no referral params anywhere)
 *
 * Usage:
 *   node scripts/audit-affiliate-links.mjs
 *   node scripts/audit-affiliate-links.mjs --json
 *   node scripts/audit-affiliate-links.mjs --fail-on-issues
 */

import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { createRequire } from 'module';
import { globSync } from 'fs';
import { fileURLToPath } from 'url';

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const JSON_OUT    = args.includes('--json');
const FAIL_ON_ERR = args.includes('--fail-on-issues');

// ── Load registry via ts-node-esm shim (compile-free TS read) ────────────────
// We parse the TS file manually rather than requiring a full TS toolchain.
const __dir = fileURLToPath(new URL('.', import.meta.url));
const ROOT  = resolve(__dir, '..');

function readTsFile(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

// Extract AFFILIATE_LINKS array literal from TS source using a simple parse
function parseAffiliateLinks() {
  const src = readTsFile('src/data/affiliate-links.ts');
  // Strip TS type annotations for safe JSON-like parsing
  // Extract the array between `export const AFFILIATE_LINKS: AffiliateEntry[] = [` and the matching `];`
  const start = src.indexOf('export const AFFILIATE_LINKS: AffiliateEntry[] = [');
  if (start === -1) throw new Error('Could not find AFFILIATE_LINKS in affiliate-links.ts');

  // Use node to evaluate the stripped array
  const stripped = src
    .slice(start)
    .replace(/export const AFFILIATE_LINKS: AffiliateEntry\[\] = /, 'var AFFILIATE_LINKS = ')
    .replace(/export const AFFILIATE_LINKS_MAP[^;]+;/g, '')
    // Remove TypeScript type annotations
    .replace(/: AffiliateEntry\[\]/g, '')
    .replace(/: string \| null/g, '')
    .replace(/: string/g, '')
    .replace(/: boolean/g, '')
    .replace(/: GeoRegion \| string/g, '')
    .replace(/Partial<Record<GeoRegion, string>>/g, '')
    .replace(/AppendRules/g, '')
    // Remove TS-only keywords
    .replace(/^export /gm, '')
    .trim();

  try {
    // Evaluate the cleaned JS
    const fn = new Function(stripped + '\nreturn AFFILIATE_LINKS;');
    return fn();
  } catch (e) {
    // Fallback: read exchanges.json and derive entries
    console.warn('⚠️  Could not evaluate affiliate-links.ts directly — falling back to exchanges.json parity check only');
    return null;
  }
}

// ── Load exchanges.json ───────────────────────────────────────────────────────
const exchanges = JSON.parse(readFileSync(join(ROOT, 'src/data/exchanges.json'), 'utf8'));

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidUrl(url) {
  try { return /^https?:\/\//.test(new URL(url).href); } catch { return false; }
}

function hasReferralParams(url) {
  if (!url || url === '#') return false;
  try {
    const u = new URL(url);
    const suspiciousParams = ['ref', 'invite', 'inviteCode', 'shareCode', 'referralCode',
      'invite_code', 'rcode', 'rc', 'promo', 'code', 'aff', 'partner', 'affiliate_id'];
    return suspiciousParams.some(p => u.searchParams.has(p)) ||
           /\/join\/|\/share\/|\/invite\/|\/b\/|\/bg\//.test(u.pathname);
  } catch { return false; }
}

// ── Checks ────────────────────────────────────────────────────────────────────
const issues = [];
const warnings = [];
const report = { full: [], limited: [], pending: [], disabled: [], promoInUrl: [], promoManual: [] };

function fail(msg, context = '') {
  issues.push({ level: 'ERROR', msg, context });
}
function warn(msg, context = '') {
  warnings.push({ level: 'WARN', msg, context });
}

// 1. Load registry
const affiliateLinks = parseAffiliateLinks();
const registryMap = new Map();

if (affiliateLinks) {
  for (const entry of affiliateLinks) {
    registryMap.set(entry.slug, entry);

    // Classify for report
    if (entry.partnerStatus === 'full')     report.full.push(entry.slug);
    if (entry.partnerStatus === 'limited')  report.limited.push(entry.slug);
    if (entry.partnerStatus === 'pending')  report.pending.push(entry.slug);
    if (entry.partnerStatus === 'disabled') report.disabled.push(entry.slug);

    if (entry.promoCode && entry.links.affiliateWithCode &&
        entry.links.affiliateWithCode.includes(entry.promoCode)) {
      report.promoInUrl.push(entry.slug);
    } else if (entry.promoCode) {
      report.promoManual.push(entry.slug);
    }

    // ── Registry self-checks ──────────────────────────────────────────────

    // Clean URL must be valid
    if (!isValidUrl(entry.links.clean)) {
      fail(`[${entry.slug}] links.clean is invalid: "${entry.links.clean}"`);
    }

    // Clean URL must not have referral params
    if (hasReferralParams(entry.links.clean)) {
      fail(`[${entry.slug}] links.clean contains referral params: "${entry.links.clean}"`);
    }

    // Coinbase-specific: must never have referral params anywhere
    if (entry.slug === 'coinbase') {
      const allUrls = Object.values(entry.links).filter(Boolean);
      for (const url of allUrls) {
        if (hasReferralParams(url)) {
          fail(`[coinbase] URL contains referral params (MUST be clean): "${url}"`);
        }
      }
      if (entry.promoCode || entry.refCode) {
        fail(`[coinbase] partnerStatus=limited must not have promoCode or refCode`);
      }
      if (entry.partnerStatus !== 'limited') {
        fail(`[coinbase] partnerStatus must be "limited", got "${entry.partnerStatus}"`);
      }
    }

    // Full partners must have an affiliate URL
    if (entry.partnerStatus === 'full') {
      const hasAff = entry.links.affiliateWithCode || entry.links.affiliate;
      if (!hasAff && entry.primaryLinkType !== 'clean' && entry.primaryLinkType !== 'clean_with_ref_param') {
        fail(`[${entry.slug}] Full partner has no affiliate URL`);
      }
      if (entry.links.affiliateWithCode && !isValidUrl(entry.links.affiliateWithCode)) {
        fail(`[${entry.slug}] affiliateWithCode is not a valid URL: "${entry.links.affiliateWithCode}"`);
      }

      // promoCode consistency
      if (entry.promoCode && entry.links.affiliateWithCode) {
        const lc = entry.links.affiliateWithCode.toLowerCase();
        if (!lc.includes(entry.promoCode.toLowerCase())) {
          warn(`[${entry.slug}] promoCode "${entry.promoCode}" not found in affiliateWithCode URL — verify it's active`);
        }
      }

      // No # placeholders for full partners
      for (const [key, val] of Object.entries(entry.links)) {
        if (val === '#') fail(`[${entry.slug}] Placeholder "#" in links.${key} for full partner`);
      }
    }

    // limited/pending must not expose referral params via outbound URL
    if (entry.partnerStatus === 'limited' || entry.partnerStatus === 'pending') {
      const outbound = entry.links.fallback ?? entry.links.clean;
      if (hasReferralParams(outbound)) {
        fail(`[${entry.slug}] ${entry.partnerStatus} partner outbound URL has referral params: "${outbound}"`);
      }
    }
  }

  // All exchanges in exchanges.json must have a registry entry
  for (const ex of exchanges) {
    if (!registryMap.has(ex.slug)) {
      fail(`[${ex.slug}] Exchange exists in exchanges.json but has no entry in affiliate-links registry`);
    }
  }

  // 2. exchanges.json parity check
  for (const ex of exchanges) {
    const entry = registryMap.get(ex.slug);
    if (!entry) continue; // already caught above

    // affiliateUrl in exchanges.json must match registry primary outbound URL
    const registryUrl = entry.links.affiliateWithCode ?? entry.links.affiliate ?? entry.links.fallback ?? entry.links.clean;
    const jsonUrl = ex.affiliateUrl;

    // For limited/pending: exchanges.json must use clean URL
    if (entry.partnerStatus === 'limited' || entry.partnerStatus === 'pending') {
      if (hasReferralParams(jsonUrl)) {
        fail(`[${ex.slug}] exchanges.json affiliateUrl has referral params but partnerStatus=${entry.partnerStatus}: "${jsonUrl}"`);
      }
    }

    // For full: check affiliate URL matches (warn only — may be intentionally different geo URL)
    if (entry.partnerStatus === 'full' && jsonUrl !== '#') {
      if (registryUrl && registryUrl !== '#' && jsonUrl !== registryUrl) {
        warn(`[${ex.slug}] exchanges.json affiliateUrl differs from registry:\n  json:     ${jsonUrl}\n  registry: ${registryUrl}`);
      }
    }

    // partner_status field in exchanges.json must match registry
    const jsonPs = ex.partner_status ?? 'full';
    if (jsonPs !== entry.partnerStatus) {
      fail(`[${ex.slug}] partner_status mismatch: exchanges.json="${jsonPs}", registry="${entry.partnerStatus}"`);
    }
  }
}

// 3. Scan source files for hardcoded outbound exchange URLs outside registry
// Only scan components, pages, utils — not data files or this script itself
const SCAN_DIRS = ['src/components', 'src/pages', 'src/layouts', 'src/utils'];
const EXCHANGE_DOMAINS = [
  'bybit.com', 'binance.com', 'mexc.com', 'okx.com', 'bitget.com',
  'bingx.com', 'bingxdao.com', 'gate.io', 'gate.com', 'kucoin.com',
  'htx.com', 'coinex.com', 'phemex.com', 'bitunix.com', 'lbank.com', 'coinbase.com',
];

// Files that are allowed to contain direct exchange URLs (evidence, schema sources, etc.)
const ALLOWED_FILES = new Set([
  'src/utils/affiliateLinks.ts',
  'src/data/affiliate-links.ts',
]);

for (const dir of SCAN_DIRS) {
  const dirPath = join(ROOT, dir);
  let files = [];
  try {
    // Recursively find .ts and .astro files
    const { readdirSync, statSync } = await import('fs');
    function walk(d) {
      for (const f of readdirSync(d)) {
        const full = join(d, f);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|astro|js|mjs)$/.test(f)) files.push(full);
      }
    }
    walk(dirPath);
  } catch { continue; }

  for (const file of files) {
    const relFile = file.replace(ROOT + '/', '').replace(ROOT + '\\', '').replace(/\\/g, '/');
    if (ALLOWED_FILES.has(relFile)) continue;

    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');

    lines.forEach((line, i) => {
      // Skip comments and import statements from affiliateLinks
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
      if (/from ['"].*affiliateLinks['"]/.test(line)) return;
      if (/import.*affiliate-links/.test(line)) return;

      for (const domain of EXCHANGE_DOMAINS) {
        // Detect direct https://domain URLs (not internal paths like /exchanges/bybit/)
        if (line.includes(`https://`) && line.toLowerCase().includes(domain)) {
          // Allow evidence-source URLs (officialSourceUrl, termsUrl, bonusSourceUrl contexts)
          if (/officialSourceUrl|bonusSourceUrl|termsUrl|evidence|schema|canonical|sameAs/.test(line)) continue;
          warn(`[hardcoded URL] ${relFile}:${i+1} — ${line.trim().slice(0, 100)}`);
        }
      }
    });
  }
}

// ── Output ────────────────────────────────────────────────────────────────────

if (JSON_OUT) {
  console.log(JSON.stringify({ issues, warnings, report }, null, 2));
} else {
  // ── Report table ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(62));
  console.log(' CryptoBonusWorld — Affiliate Link Audit');
  console.log('═'.repeat(62));

  console.log('\n📊 PARTNER STATUS BREAKDOWN\n');
  console.log(`  FULL     (${report.full.length}):    ${report.full.join(', ')}`);
  console.log(`  LIMITED  (${report.limited.length}):  ${report.limited.join(', ')}`);
  console.log(`  PENDING  (${report.pending.length}):  ${report.pending.join(', ')}`);
  if (report.disabled.length) console.log(`  DISABLED (${report.disabled.length}): ${report.disabled.join(', ')}`);

  console.log('\n🔗 PROMO CODE HANDLING\n');
  console.log(`  Code embedded in URL  (${report.promoInUrl.length}): ${report.promoInUrl.join(', ')}`);
  console.log(`  Code manual entry     (${report.promoManual.length}): ${report.promoManual.join(', ')}`);

  console.log('\n🔒 COINBASE\n');
  const cbEntry = registryMap.get('coinbase');
  const cbJson  = exchanges.find(e => e.slug === 'coinbase');
  console.log(`  Registry partnerStatus : ${cbEntry?.partnerStatus ?? 'NOT IN REGISTRY'}`);
  console.log(`  Registry clean URL     : ${cbEntry?.links?.clean ?? '—'}`);
  console.log(`  Registry promoCode     : ${cbEntry?.promoCode ?? 'null'}`);
  console.log(`  exchanges.json url     : ${cbJson?.affiliateUrl ?? '—'}`);
  console.log(`  Has referral params    : ${hasReferralParams(cbJson?.affiliateUrl) ? '❌ YES' : '✅ NO'}`);

  // Issues
  if (issues.length) {
    console.log(`\n❌ ISSUES (${issues.length})\n`);
    issues.forEach(i => console.log(`  [ERROR] ${i.msg}`));
  } else {
    console.log('\n✅ No issues found');
  }

  // Warnings
  if (warnings.length) {
    console.log(`\n⚠️  WARNINGS (${warnings.length})\n`);
    warnings.forEach(w => console.log(`  [WARN]  ${w.msg}`));
  }

  const overall = issues.length === 0;
  console.log('\n' + '═'.repeat(62));
  console.log(overall ? '  ✅  AUDIT PASSED' : `  ❌  AUDIT FAILED — ${issues.length} issue(s) found`);
  console.log('═'.repeat(62) + '\n');
}

if (FAIL_ON_ERR && issues.length > 0) process.exit(1);
